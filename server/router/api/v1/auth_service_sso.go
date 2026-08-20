package v1

import (
	"context"
	"regexp"
	"strconv"
	"strings"

	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/usememos/memos/internal/base"
	"github.com/usememos/memos/internal/util"
	"github.com/usememos/memos/plugin/idp"
	"github.com/usememos/memos/plugin/idp/oauth2"
	storepb "github.com/usememos/memos/proto/gen/store"
	"github.com/usememos/memos/store"
)

const ssoUsernameFallbackAttempts = 5

func identityProviderKey(identityProvider *storepb.IdentityProvider) string {
	return strconv.Itoa(int(identityProvider.Id))
}

func deriveSSOUsername() (string, error) {
	suffix, err := util.RandomString(12)
	if err != nil {
		return "", err
	}
	username := "sso-" + strings.ToLower(suffix)
	if !base.UIDMatcher.MatchString(username) {
		return "", errors.New("generated username did not satisfy username constraints")
	}
	return username, nil
}

func (s *APIV1Service) resolveSSOUser(ctx context.Context, currentUser *store.User, identityProvider *storepb.IdentityProvider, userInfo *idp.IdentityProviderUserInfo) (*store.User, error) {
	provider := identityProviderKey(identityProvider)
	externUID := userInfo.Identifier
	if externUID == "" {
		return nil, status.Errorf(codes.InvalidArgument, "identity provider returned an empty subject identifier")
	}

	user, err := s.getLinkedSSOUser(ctx, provider, externUID)
	if err != nil {
		return nil, err
	}
	if user != nil {
		if currentUser != nil && currentUser.ID != user.ID {
			return nil, status.Errorf(codes.AlreadyExists, "identity provider account is already linked to another user")
		}
		return user, nil
	}

	if currentUser != nil {
		return s.bindSSOIdentityToUser(ctx, currentUser, provider, externUID)
	}

	instanceGeneralSetting, err := s.Store.GetInstanceGeneralSetting(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get instance general setting, error: %v", err)
	}
	if instanceGeneralSetting.DisallowUserRegistration {
		return nil, status.Errorf(codes.PermissionDenied, "user registration is not allowed")
	}

	password, err := util.RandomString(20)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate random password, error: %v", err)
	}
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to generate password hash, error: %v", err)
	}
	user, err = s.createSSOUser(ctx, userInfo, string(passwordHash), provider, externUID)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to create user, error: %v", err)
	}
	return user, nil
}

func (s *APIV1Service) createSSOUser(
	ctx context.Context,
	userInfo *idp.IdentityProviderUserInfo,
	passwordHash string,
	provider string,
	externUID string,
) (*store.User, error) {
	tryUsername := func(username string) (*store.User, error) {
		user, err := s.Store.CreateUserWithIdentity(ctx, &store.User{
			Username:     username,
			Role:         store.RoleUser,
			Nickname:     userInfo.DisplayName,
			Email:        userInfo.Email,
			AvatarURL:    userInfo.AvatarURL,
			PasswordHash: passwordHash,
		}, &store.UserIdentity{
			Provider:  provider,
			ExternUID: externUID,
		})
		if err == nil {
			return user, nil
		}
		if !isUniqueConstraintViolation(err) {
			return nil, err
		}
		return s.getLinkedSSOUser(ctx, provider, externUID)
	}

	if base.UIDMatcher.MatchString(strings.ToLower(userInfo.Identifier)) {
		user, err := tryUsername(userInfo.Identifier)
		if err != nil {
			return nil, err
		}
		if user != nil {
			return user, nil
		}
	}

	for range ssoUsernameFallbackAttempts {
		username, err := deriveSSOUsername()
		if err != nil {
			return nil, err
		}
		user, err := tryUsername(username)
		if err != nil {
			return nil, err
		}
		if user != nil {
			return user, nil
		}
	}

	return nil, errors.Errorf("exhausted %d username attempts", ssoUsernameFallbackAttempts)
}

func (s *APIV1Service) resolveSSOIdentityByID(ctx context.Context, idpID int32, code, redirectURI, codeVerifier string) (*storepb.IdentityProvider, *idp.IdentityProviderUserInfo, error) {
	identityProvider, err := s.Store.GetIdentityProvider(ctx, &store.FindIdentityProvider{
		ID: &idpID,
	})
	if err != nil {
		return nil, nil, status.Errorf(codes.Internal, "failed to get identity provider, error: %v", err)
	}
	if identityProvider == nil {
		return nil, nil, status.Errorf(codes.InvalidArgument, "identity provider not found")
	}

	var userInfo *idp.IdentityProviderUserInfo
	if identityProvider.Type == storepb.IdentityProvider_OAUTH2 {
		oauth2IdentityProvider, err := oauth2.NewIdentityProvider(identityProvider.Config.GetOauth2Config())
		if err != nil {
			return nil, nil, status.Errorf(codes.Internal, "failed to create oauth2 identity provider, error: %v", err)
		}
		token, err := oauth2IdentityProvider.ExchangeToken(ctx, redirectURI, code, codeVerifier)
		if err != nil {
			return nil, nil, status.Errorf(codes.Internal, "failed to exchange token, error: %v", err)
		}
		userInfo, err = oauth2IdentityProvider.UserInfo(token)
		if err != nil {
			return nil, nil, status.Errorf(codes.Internal, "failed to get user info, error: %v", err)
		}
	}

	if userInfo == nil || userInfo.Identifier == "" {
		return nil, nil, status.Errorf(codes.InvalidArgument, "identity provider returned an empty subject identifier")
	}

	identifierFilter := identityProvider.IdentifierFilter
	if identifierFilter != "" {
		identifierFilterRegex, err := regexp.Compile(identifierFilter)
		if err != nil {
			return nil, nil, status.Errorf(codes.Internal, "failed to compile identifier filter regex, error: %v", err)
		}
		if !identifierFilterRegex.MatchString(userInfo.Identifier) {
			return nil, nil, status.Errorf(codes.PermissionDenied, "identifier %s is not allowed", userInfo.Identifier)
		}
	}

	return identityProvider, userInfo, nil
}

func (s *APIV1Service) resolveSSOIdentity(ctx context.Context, idpName, code, redirectURI, codeVerifier string) (*storepb.IdentityProvider, *idp.IdentityProviderUserInfo, error) {
	idpID, err := ExtractIdentityProviderIDFromName(idpName)
	if err != nil {
		return nil, nil, status.Errorf(codes.InvalidArgument, "invalid identity provider name: %v", err)
	}
	return s.resolveSSOIdentityByID(ctx, idpID, code, redirectURI, codeVerifier)
}

func (s *APIV1Service) getLinkedSSOUser(ctx context.Context, provider, externUID string) (*store.User, error) {
	identity, err := s.Store.GetUserIdentity(ctx, &store.FindUserIdentity{
		Provider:  &provider,
		ExternUID: &externUID,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user identity, error: %v", err)
	}
	if identity == nil {
		return nil, nil
	}
	user, err := s.Store.GetUser(ctx, &store.FindUser{ID: &identity.UserID})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user, error: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.Internal, "linked user %d not found for identity %d", identity.UserID, identity.ID)
	}
	return user, nil
}

func (s *APIV1Service) bindSSOIdentityToUser(ctx context.Context, currentUser *store.User, provider, externUID string) (*store.User, error) {
	existingForProvider, err := s.Store.GetUserIdentity(ctx, &store.FindUserIdentity{
		UserID:   &currentUser.ID,
		Provider: &provider,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get existing linked identity, error: %v", err)
	}
	if existingForProvider != nil {
		if existingForProvider.ExternUID == externUID {
			return currentUser, nil
		}
		return nil, status.Errorf(codes.AlreadyExists, "identity provider is already linked to another external account for this user")
	}

	if _, err := s.Store.CreateUserIdentity(ctx, &store.UserIdentity{
		UserID:    currentUser.ID,
		Provider:  provider,
		ExternUID: externUID,
	}); err != nil {
		if isUniqueConstraintViolation(err) {
			winner, getErr := s.getLinkedSSOUser(ctx, provider, externUID)
			if getErr != nil {
				return nil, getErr
			}
			if winner != nil {
				if winner.ID != currentUser.ID {
					return nil, status.Errorf(codes.AlreadyExists, "identity provider account is already linked to another user")
				}
				return currentUser, nil
			}

			existingForProvider, getErr := s.Store.GetUserIdentity(ctx, &store.FindUserIdentity{
				UserID:   &currentUser.ID,
				Provider: &provider,
			})
			if getErr != nil {
				return nil, status.Errorf(codes.Internal, "failed to reload linked identity after race, error: %v", getErr)
			}
			if existingForProvider != nil {
				if existingForProvider.ExternUID == externUID {
					return currentUser, nil
				}
				return nil, status.Errorf(codes.AlreadyExists, "identity provider is already linked to another external account for this user")
			}

			return nil, status.Errorf(codes.Internal, "user identity conflict reported but no winning row found")
		}
		return nil, status.Errorf(codes.Internal, "failed to create user identity, error: %v", err)
	}
	return currentUser, nil
}

func isUniqueConstraintViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "UNIQUE constraint failed") ||
		strings.Contains(msg, "duplicate key") ||
		strings.Contains(msg, "Duplicate entry")
}

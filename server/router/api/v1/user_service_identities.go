package v1

import (
	"context"
	"fmt"
	"strconv"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"

	v1pb "github.com/usememos/memos/proto/gen/api/v1"
	"github.com/usememos/memos/store"
)

func (s *APIV1Service) resolveUserFromParent(ctx context.Context, parent string) (*store.User, error) {
	identifier := extractUserIdentifierFromName(parent)
	if identifier == "" {
		return nil, status.Errorf(codes.InvalidArgument, "invalid parent: %s", parent)
	}

	var user *store.User
	var err error
	if userID, parseErr := strconv.ParseInt(identifier, 10, 32); parseErr == nil {
		userID32 := int32(userID)
		user, err = s.Store.GetUser(ctx, &store.FindUser{ID: &userID32})
	} else {
		user, err = s.Store.GetUser(ctx, &store.FindUser{Username: &identifier})
	}
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get user: %v", err)
	}
	if user == nil {
		return nil, status.Errorf(codes.NotFound, "user not found")
	}
	return user, nil
}

func convertLinkedIdentityFromStore(user *store.User, identity *store.UserIdentity) *v1pb.LinkedIdentity {
	return &v1pb.LinkedIdentity{
		Name:      fmt.Sprintf("%s%d/linkedIdentities/%s", UserNamePrefix, user.ID, identity.Provider),
		IdpName:   IdentityProviderNamePrefix + identity.Provider,
		ExternUid: identity.ExternUID,
	}
}

func (s *APIV1Service) ListLinkedIdentities(ctx context.Context, request *v1pb.ListLinkedIdentitiesRequest) (*v1pb.ListLinkedIdentitiesResponse, error) {
	user, err := s.resolveUserFromParent(ctx, request.Parent)
	if err != nil {
		return nil, err
	}

	currentUser, err := s.fetchCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}
	if currentUser == nil {
		return nil, status.Errorf(codes.Unauthenticated, "user not authenticated")
	}
	if currentUser.ID != user.ID && currentUser.Role != store.RoleHost && currentUser.Role != store.RoleAdmin {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	userID := user.ID
	identities, err := s.Store.ListUserIdentities(ctx, &store.FindUserIdentity{UserID: &userID})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to list linked identities: %v", err)
	}

	response := &v1pb.ListLinkedIdentitiesResponse{
		LinkedIdentities: []*v1pb.LinkedIdentity{},
	}
	for _, identity := range identities {
		response.LinkedIdentities = append(response.LinkedIdentities, convertLinkedIdentityFromStore(user, identity))
	}
	return response, nil
}

func (s *APIV1Service) CreateLinkedIdentity(ctx context.Context, request *v1pb.CreateLinkedIdentityRequest) (*v1pb.LinkedIdentity, error) {
	user, err := s.resolveUserFromParent(ctx, request.Parent)
	if err != nil {
		return nil, err
	}

	currentUser, err := s.fetchCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}
	if currentUser == nil {
		return nil, status.Errorf(codes.Unauthenticated, "user not authenticated")
	}
	if currentUser.ID != user.ID {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	identityProvider, userInfo, err := s.resolveSSOIdentity(ctx, request.IdpName, request.Code, request.RedirectUri, request.CodeVerifier)
	if err != nil {
		return nil, err
	}
	provider := identityProviderKey(identityProvider)
	externUID := userInfo.Identifier

	if _, err := s.bindSSOIdentityToUser(ctx, currentUser, provider, externUID); err != nil {
		return nil, err
	}

	identity, err := s.Store.GetUserIdentity(ctx, &store.FindUserIdentity{
		UserID:   &currentUser.ID,
		Provider: &provider,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get linked identity: %v", err)
	}
	if identity == nil {
		return nil, status.Errorf(codes.Internal, "linked identity not found after creation")
	}

	return convertLinkedIdentityFromStore(user, identity), nil
}

func (s *APIV1Service) GetLinkedIdentity(ctx context.Context, request *v1pb.GetLinkedIdentityRequest) (*v1pb.LinkedIdentity, error) {
	user, provider, err := s.resolveUserAndLinkedIdentityProviderFromName(ctx, request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid linked identity name: %v", err)
	}

	currentUser, err := s.fetchCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}
	if currentUser == nil {
		return nil, status.Errorf(codes.Unauthenticated, "user not authenticated")
	}
	if currentUser.ID != user.ID && currentUser.Role != store.RoleHost && currentUser.Role != store.RoleAdmin {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	userID := user.ID
	identity, err := s.Store.GetUserIdentity(ctx, &store.FindUserIdentity{
		UserID:   &userID,
		Provider: &provider,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get linked identity: %v", err)
	}
	if identity == nil {
		return nil, status.Errorf(codes.NotFound, "linked identity not found")
	}

	return convertLinkedIdentityFromStore(user, identity), nil
}

func (s *APIV1Service) DeleteLinkedIdentity(ctx context.Context, request *v1pb.DeleteLinkedIdentityRequest) (*emptypb.Empty, error) {
	user, provider, err := s.resolveUserAndLinkedIdentityProviderFromName(ctx, request.Name)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "invalid linked identity name: %v", err)
	}

	currentUser, err := s.fetchCurrentUser(ctx)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get current user: %v", err)
	}
	if currentUser == nil {
		return nil, status.Errorf(codes.Unauthenticated, "user not authenticated")
	}
	if currentUser.ID != user.ID && currentUser.Role != store.RoleHost && currentUser.Role != store.RoleAdmin {
		return nil, status.Errorf(codes.PermissionDenied, "permission denied")
	}

	userID := user.ID
	existing, err := s.Store.GetUserIdentity(ctx, &store.FindUserIdentity{
		UserID:   &userID,
		Provider: &provider,
	})
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get linked identity: %v", err)
	}
	if existing == nil {
		return nil, status.Errorf(codes.NotFound, "linked identity not found")
	}

	if err := s.Store.DeleteUserIdentities(ctx, &store.DeleteUserIdentity{
		UserID:   &userID,
		Provider: &provider,
	}); err != nil {
		return nil, status.Errorf(codes.Internal, "failed to delete linked identity: %v", err)
	}
	return &emptypb.Empty{}, nil
}

func (s *APIV1Service) resolveUserAndLinkedIdentityProviderFromName(ctx context.Context, name string) (*store.User, string, error) {
	tokens, err := GetNameParentTokens(name, UserNamePrefix, "linkedIdentities/")
	if err != nil {
		return nil, "", err
	}
	user, err := s.resolveUserFromParent(ctx, UserNamePrefix+tokens[0])
	if err != nil {
		return nil, "", err
	}
	return user, tokens[1], nil
}

package filter

import (
	"math"
	"testing"

	"github.com/stretchr/testify/require"
	exprv1 "google.golang.org/genproto/googleapis/api/expr/v1alpha1"
)

func TestNumericConversionsRejectOverflow(t *testing.T) {
	value, err := toInt64(uint64(math.MaxInt64))
	require.NoError(t, err)
	require.Equal(t, int64(math.MaxInt64), value)

	_, err = toInt64(uint64(math.MaxUint64))
	require.Error(t, err)
	_, err = toInt64(math.Inf(1))
	require.Error(t, err)
	_, err = toInt64(math.NaN())
	require.Error(t, err)
}

func TestGetConstValueRejectsUint64Overflow(t *testing.T) {
	expr := &exprv1.Expr{
		ExprKind: &exprv1.Expr_ConstExpr{
			ConstExpr: &exprv1.Constant{
				ConstantKind: &exprv1.Constant_Uint64Value{Uint64Value: math.MaxUint64},
			},
		},
	}

	_, err := getConstValue(expr)
	require.Error(t, err)
}

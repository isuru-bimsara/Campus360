import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      loginWithToken(token)
        .then((user) => {
          switch (user.role.toLowerCase()) {
            case "admin":
              navigate("/admin/dashboard");
              break;
            case "user":
              navigate("/user/dashboard");
              break;

            case "technician":
              navigate("/tech/dashboard");
              break;
            case "operation_manager":
              navigate("/operation-manager/dashboard");
              break;
            default:
              navigate("/login");
          }
        })
        .catch(() => navigate("/login"));
    } else {
      navigate("/login");
    }
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}

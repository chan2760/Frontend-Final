//You can modify this component.

import { useEffect } from "react";
import { useUser } from "../contexts/UserContext";

export default function Logout() {
  const { logout } = useUser();

  useEffect(() => {
    logout();
  }, [logout]);

  return <h3>Logging out...</h3>;
}

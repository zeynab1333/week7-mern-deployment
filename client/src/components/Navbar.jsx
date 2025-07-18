import { Link, useLocation, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";

export default function Navbar() {
  const { pathname } = useLocation();
  const { isLoggedIn, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-900 shadow mb-6 transition-colors">
      <div className="text-xl font-bold text-primary dark:text-white">MERN Blog</div>
      <div className="space-x-2 flex items-center">
        <Button asChild variant={pathname === "/" ? "default" : "outline"}>
          <Link to="/">Posts</Link>
        </Button>
        {isLoggedIn && (
          <Button asChild variant={pathname === "/create" ? "default" : "outline"}>
            <Link to="/create">Create Post</Link>
          </Button>
        )}
        {!isLoggedIn ? (
          <>
            <Button asChild variant={pathname === "/login" ? "default" : "outline"}>
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant={pathname === "/register" ? "default" : "outline"}>
              <Link to="/register">Register</Link>
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => { logout(); navigate("/"); }}>
            Logout
          </Button>
        )}
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
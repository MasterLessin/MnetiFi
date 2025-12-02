import { useEffect, useCallback, useState } from "react";
import { useLocation } from "wouter";

const SESSION_KEY = "admin_session";
const SESSION_TIMEOUT = 10 * 60 * 1000;

interface SessionUser {
  id: string;
  username: string;
  role: string;
}

interface Session {
  user: SessionUser;
  lastActivity: string;
}

export function useSession() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(() => {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) {
      setUser(null);
      setIsLoading(false);
      return false;
    }

    try {
      const session: Session = JSON.parse(sessionStr);
      const lastActivity = new Date(session.lastActivity).getTime();
      const now = Date.now();

      if (now - lastActivity >= SESSION_TIMEOUT) {
        localStorage.removeItem(SESSION_KEY);
        setUser(null);
        setIsLoading(false);
        return false;
      }

      setUser(session.user);
      setIsLoading(false);
      return true;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  }, []);

  const updateActivity = useCallback(() => {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (sessionStr) {
      try {
        const session: Session = JSON.parse(sessionStr);
        session.lastActivity = new Date().toISOString();
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      } catch {
        // Invalid session
      }
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    setLocation("/login");
  }, [setLocation]);

  useEffect(() => {
    checkSession();

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];
    
    const handleActivity = () => {
      updateActivity();
    };

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    const intervalId = setInterval(() => {
      if (!checkSession()) {
        setLocation("/login");
      }
    }, 30000);

    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearInterval(intervalId);
    };
  }, [checkSession, updateActivity, setLocation]);

  return { user, isLoading, logout, checkSession, updateActivity };
}

export function useRequireAuth() {
  const { user, isLoading, logout, updateActivity } = useSession();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  return { user, isLoading, logout, updateActivity };
}

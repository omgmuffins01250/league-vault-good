// src/auth.js
export const auth = {
    isSignedIn: () => !!localStorage.getItem("lv_user"),
    signIn: (email = "mike@example.com") => localStorage.setItem("lv_user", email),
    signOut: () => localStorage.removeItem("lv_user"),
    currentUser: () => localStorage.getItem("lv_user"),
  };
  
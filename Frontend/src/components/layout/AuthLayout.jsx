/**
 * Layout for authentication pages (login, signup).
 * Now supports full-screen split-screen designs.
 * Children components handle their own layout.
 */
const AuthLayout = ({ children }) => {
  return <div className="h-screen overflow-hidden font-sans">{children}</div>;
};
export default AuthLayout;

import { NavLink } from "react-router-dom";

function FooterLinks({ links }) {
  return (
    <div className="grid w-full max-w-xs grid-cols-2 gap-x-4 gap-y-2 text-center sm:max-w-sm md:flex md:w-auto md:max-w-none md:items-center md:gap-8 md:text-left">
      {links.map((link) => {
        if (link.to) {
          return (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `text-xs font-bold transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-text-dark hover:text-primary dark:text-background-light"
                }`
              }
            >
              {link.label}
            </NavLink>
          );
        }

        return (
          <a
            key={link.label}
            className="text-xs font-bold text-text-dark transition-colors hover:text-primary dark:text-background-light"
            href={link.href}
          >
            {link.label}
          </a>
        );
      })}
    </div>
  );
}

export default FooterLinks;

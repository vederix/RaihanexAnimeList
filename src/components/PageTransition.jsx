import { useLocation } from "react-router-dom";

const PageTransition = ({ children }) => {
  const location = useLocation();

  return (
    <div key={location.pathname} className="page-enter-view w-full">
      {children}
    </div>
  );
};

export default PageTransition;

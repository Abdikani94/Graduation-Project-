
const PageLayout = ({ children, className = '' }) => {
  return (
    <div className={`admin-page-layout flex flex-col w-full ${className}`}>
      {children}
    </div>
  );
};

export default PageLayout;

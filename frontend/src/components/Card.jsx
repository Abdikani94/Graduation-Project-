
const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`admin-card bg-card-bg border border-border-color ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

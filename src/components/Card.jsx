
const Card = ({ children, className = '', ...props }) => {
  return (
    <div 
      className={`bg-card-bg border border-border-color rounded-[5px] shadow-[0_14px_34px_rgba(24,43,73,0.08)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;

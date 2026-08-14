import Card from './Card';

const StatCard = ({ icon: Icon, title, value, color, iconColor }) => {
  return (
    <Card className="stat-card flex flex-col relative overflow-hidden">
      <div className="stat-card-content flex flex-col p-4 gap-2 h-full justify-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center" style={{ color: iconColor }}>
            {Icon && <Icon size={16} strokeWidth={2.5} />}
          </div>
        </div>
        <div className="flex flex-col">
          <p className="text-text-muted text-[13px] font-medium">{title}</p>
          <h3 className="text-text-dark text-[26px] font-semibold tracking-tight">{value}</h3>
        </div>
      </div>
      <div className="stat-card-accent absolute bottom-0 left-0 h-[3px] w-[100%]" style={{ backgroundColor: color }}></div>
    </Card>
  );
};

export default StatCard;

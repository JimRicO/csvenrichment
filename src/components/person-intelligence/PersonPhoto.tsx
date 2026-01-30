import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface PersonPhotoProps {
  name: string;
  photoUrl: string | null;
  aliases?: string[];
}

const PersonPhoto = ({ name, photoUrl, aliases }: PersonPhotoProps) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-start gap-4">
      <Avatar className="h-16 w-16 border-2 border-primary/20">
        {photoUrl ? (
          <AvatarImage src={photoUrl} alt={name} />
        ) : null}
        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <h2 className="text-2xl font-bold truncate">{name}</h2>
        {aliases && aliases.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-xs text-muted-foreground">Also known as:</span>
            {aliases.slice(0, 3).map((alias, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {alias}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonPhoto;

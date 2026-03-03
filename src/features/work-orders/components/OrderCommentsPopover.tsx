import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";

interface OrderCommentsPopoverProps {
  comments?: string[];
}

export function OrderCommentsPopover({ comments }: OrderCommentsPopoverProps) {
  const { t } = useTranslation();

  if (!comments || comments.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-600 relative"
        >
          <MessageSquare size={16} />
          <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
            {comments.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-60 overflow-auto">
        <h4 className="font-semibold text-sm mb-2">
          {t("order.comments")}
        </h4>
        <div className="space-y-2">
          {comments.map((comment, idx) => (
            <div
              key={idx}
              className="text-sm p-2 bg-muted rounded-md"
            >
              {comment}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

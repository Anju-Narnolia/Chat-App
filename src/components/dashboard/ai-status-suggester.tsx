"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Lightbulb, LoaderCircle, Sparkles } from "lucide-react";
import { suggestTaskStatusAction } from "@/app/dashboard/actions";
import type { SuggestTaskStatusOutput } from "@/ai/flows/task-status-suggestion";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function AiStatusSuggester({ taskId }: { taskId: string }) {
  const [suggestion, setSuggestion] = useState<SuggestTaskStatusOutput | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggestStatus = async () => {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const result = await suggestTaskStatusAction(taskId);
      if (result) {
        setSuggestion(result);
      } else {
        throw new Error("Failed to get suggestion.");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not fetch AI suggestion. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover onOpenChange={() => setSuggestion(null)}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSuggestStatus}
          disabled={isLoading}
          className="text-muted-foreground hover:text-accent hover:bg-accent/10"
        >
          {isLoading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
          <span className="sr-only">Suggest Status</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none font-headline flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              AI Suggestion
            </h4>
            {isLoading && <p className="text-sm text-muted-foreground">Generating suggestion...</p>}
          </div>
          {suggestion && (
            <div className="grid gap-2">
              <p className="text-sm text-muted-foreground">
                {suggestion.reason}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Suggested Status:</span>
                <Badge variant="secondary">{suggestion.suggestedStatus}</Badge>
              </div>
              <Button
                onClick={() => {
                  toast({
                    title: "Status Updated!",
                    description: `Task status set to "${suggestion.suggestedStatus}".`,
                  });
                }}
                className="mt-2"
                size="sm"
              >
                Accept Suggestion
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

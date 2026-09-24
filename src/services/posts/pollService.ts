import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { tx } from "@/i18n/tx";
export interface PollOption {
  name: string;
  voteCount?: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  endTime: string;
  multipleChoice: boolean;
}

export interface PollResults {
  options: { index: number; name: string; voteCount: number }[];
  totalVotes: number;
  votersCount: number;
  userVotes: number[];
  isClosed: boolean;
}

// Create a poll (returns the ActivityPub Question object structure)
export const createPollObject = (
  question: string,
  options: string[],
  durationMinutes: number,
  multipleChoice: boolean
): Record<string, unknown> => {
  const endTime = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
  
  const optionObjects = options.map(name => ({
    type: "Note",
    name,
    replies: {
      type: "Collection",
      totalItems: 0
    }
  }));

  return {
    type: "Question",
    content: question,
    endTime,
    votersCount: 0,
    [multipleChoice ? "anyOf" : "oneOf"]: optionObjects
  };
};

// Vote on a poll
export const votePoll = async (
  pollId: string,
  optionIndices: number[]
): Promise<boolean> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      toast.error(tx("ui.pollService.duMasteVaraInloggad"));
      return false;
    }

    const { error } = await supabase.rpc('set_poll_votes', {
      p_poll_id: pollId, p_option_indices: optionIndices,
    });

    if (error) {
      console.error("Error voting:", error);
      toast.error(tx("ui.pollService.kundeInteSkickaRost"));
      return false;
    }

    toast.success(tx("ui.pollService.rostRegistrerad"));
    return true;
  } catch (error) {
    console.error("Error in votePoll:", error);
    toast.error(tx("ui.pollService.kundeInteRosta"));
    return false;
  }
};

// Get poll results
export const getPollResults = async (
  pollId: string,
  pollContent: Record<string, unknown>
): Promise<PollResults | null> => {
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    
    // Normalize: extract Question from Create if nested
    let normalizedContent = pollContent;
    if (pollContent?.type === 'Create' && 
        pollContent?.object && 
        typeof pollContent.object === 'object' &&
        (pollContent.object as Record<string, unknown>).type === 'Question') {
      normalizedContent = pollContent.object as Record<string, unknown>;
    }

    // Get vote counts using the database function
    const { data: voteCounts, error: countError } = await supabase
      .rpc("get_poll_results", { poll_uuid: pollId });

    if (countError) {
      throw countError;
    }

    // Get user's votes if logged in
    let userVotes: number[] = [];
    if (userId) {
      const { data: userVoteData } = await supabase
        .rpc("has_user_voted", { poll_uuid: pollId, check_user_id: userId });
      
      userVotes = (userVoteData || []).map((v: { option_index: number }) => v.option_index);
    }

    // Parse options from normalized poll content
    const rawOptions = normalizedContent?.oneOf || normalizedContent?.anyOf || [];
    const optionsArray = Array.isArray(rawOptions) ? rawOptions : [];
    
    // Build results with vote counts - ensure name is a string
    const voteCountMap = new Map<number, number>();
    (voteCounts || []).forEach((vc: { option_index: number; vote_count: number }) => {
      voteCountMap.set(vc.option_index, Number(vc.vote_count));
    });

    const options = optionsArray.map((opt: unknown, index: number) => {
      let name = 'Unknown option';
      if (typeof opt === 'object' && opt !== null && 'name' in opt) {
        const optName = (opt as { name: unknown }).name;
        name = typeof optName === 'string' ? optName : String(optName);
      }
      return {
        index,
        name,
        voteCount: voteCountMap.get(index) || 0
      };
    });

    const totalVotes = options.reduce((sum, opt) => sum + opt.voteCount, 0);
    
    const votersCount = Number(voteCounts?.[0]?.voters_count || 0);

    // Check if poll is closed - use normalized content
    const endTime = normalizedContent?.endTime as string | undefined;
    const isClosed = endTime ? new Date(endTime) < new Date() : false;

    return {
      options,
      totalVotes,
      votersCount,
      userVotes,
      isClosed
    };
  } catch (error) {
    console.error("Error getting poll results:", error);
    return null;
  }
};

// Check if content is a poll
export const isPoll = (content: Record<string, unknown>): boolean => {
  // Direct Question type
  if (content?.type === "Question" && (
    Array.isArray(content.oneOf) || Array.isArray(content.anyOf)
  )) {
    return true;
  }
  
  // Create activity wrapping a Question
  const obj = content?.object as Record<string, unknown> | undefined;
  if (content?.type === "Create" && obj?.type === "Question" && (
    Array.isArray(obj.oneOf) || Array.isArray(obj.anyOf)
  )) {
    return true;
  }
  
  return false;
};

// Get poll duration options
export const pollDurationOptions = [
  { label: "1 timme", minutes: 60 },
  { label: "6 timmar", minutes: 360 },
  { label: "1 dag", minutes: 1440 },
  { label: "3 dagar", minutes: 4320 },
  { label: "7 dagar", minutes: 10080 }
];

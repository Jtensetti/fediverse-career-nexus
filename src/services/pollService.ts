import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      toast.error("You must be logged in to vote");
      return false;
    }

    const userId = session.session.user.id;

    // Remove existing votes first (for changing vote)
    await supabase
      .from("poll_votes")
      .delete()
      .eq("poll_id", pollId)
      .eq("user_id", userId);

    // Insert new votes
    const votes = optionIndices.map(optionIndex => ({
      poll_id: pollId,
      user_id: userId,
      option_index: optionIndex
    }));

    const { error } = await supabase.from("poll_votes").insert(votes);

    if (error) {
      console.error("Error voting:", error);
      toast.error("Failed to submit vote");
      return false;
    }

    toast.success("Vote submitted!");
    return true;
  } catch (error) {
    console.error("Error in votePoll:", error);
    toast.error("Failed to vote");
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

    // Get vote counts using the database function
    const { data: voteCounts, error: countError } = await supabase
      .rpc("get_poll_results", { poll_uuid: pollId });

    if (countError) {
      console.error("Error getting poll results:", countError);
    }

    // Get user's votes if logged in
    let userVotes: number[] = [];
    if (userId) {
      const { data: userVoteData } = await supabase
        .rpc("has_user_voted", { poll_uuid: pollId, check_user_id: userId });
      
      userVotes = (userVoteData || []).map((v: { option_index: number }) => v.option_index);
    }

    // Parse options from poll content
    const optionsArray = (pollContent.oneOf || pollContent.anyOf || []) as Array<{ name: string }>;
    
    // Build results with vote counts
    const voteCountMap = new Map<number, number>();
    (voteCounts || []).forEach((vc: { option_index: number; vote_count: number }) => {
      voteCountMap.set(vc.option_index, Number(vc.vote_count));
    });

    const options = optionsArray.map((opt, index) => ({
      index,
      name: opt.name,
      voteCount: voteCountMap.get(index) || 0
    }));

    const totalVotes = options.reduce((sum, opt) => sum + opt.voteCount, 0);
    
    // Get unique voters count
    const votersCount = new Set(
      (voteCounts || []).map(() => 1)
    ).size;

    // Check if poll is closed
    const endTime = pollContent.endTime as string | undefined;
    const isClosed = endTime ? new Date(endTime) < new Date() : false;

    return {
      options,
      totalVotes,
      votersCount: (pollContent.votersCount as number) || votersCount,
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
  return content?.type === "Question" && (
    Array.isArray(content.oneOf) || Array.isArray(content.anyOf)
  );
};

// Get poll duration options
export const pollDurationOptions = [
  { label: "1 hour", minutes: 60 },
  { label: "6 hours", minutes: 360 },
  { label: "1 day", minutes: 1440 },
  { label: "3 days", minutes: 4320 },
  { label: "7 days", minutes: 10080 }
];

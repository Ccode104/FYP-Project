-- Migration to add media state tracking to live_lecture_participants table

-- Add columns for tracking participant media states
ALTER TABLE live_lecture_participants
ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_video_off BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_hand_raised BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_screen_sharing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT now();

-- Add comment for documentation
COMMENT ON COLUMN live_lecture_participants.is_muted IS 'Whether the participant has muted their microphone';
COMMENT ON COLUMN live_lecture_participants.is_video_off IS 'Whether the participant has turned off their camera';
COMMENT ON COLUMN live_lecture_participants.is_hand_raised IS 'Whether the participant has raised their hand';
COMMENT ON COLUMN live_lecture_participants.is_screen_sharing IS 'Whether the participant is currently screen sharing';
COMMENT ON COLUMN live_lecture_participants.last_activity IS 'Timestamp of the last activity/update from this participant';

-- Create index for performance on active participants
CREATE INDEX IF NOT EXISTS idx_live_lecture_participants_active
ON live_lecture_participants(live_lecture_id, left_at)
WHERE left_at IS NULL;
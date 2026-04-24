import { defaultAudioService } from '../audio/AudioService';

export { SFX_VOLUME_SCALE, defaultAudioService } from '../audio/AudioService';

export const getAudioUrl = defaultAudioService.getAudioUrl;
export const getSoundEnabled = defaultAudioService.getSoundEnabled;
export const playSfx = defaultAudioService.playSfx;
export const setMatchActive = defaultAudioService.setMatchActive;
export const toggleSound = defaultAudioService.toggleSound;

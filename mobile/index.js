import 'react-native-reanimated';
import {AppRegistry} from 'react-native';
import TrackPlayer from 'react-native-track-player';

import App from './src/App';
import {name as appName} from './app.json';
import playbackService from './src/services/trackPlayerService';

AppRegistry.registerComponent(appName, () => App);
TrackPlayer.registerPlaybackService(() => playbackService);

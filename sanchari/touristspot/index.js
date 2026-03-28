/**
 * @format
 */

import React from 'react';
import { AppRegistry, ActivityIndicator, View } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { initializeBaseURL } from './src/api';

function Root() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    initializeBaseURL().finally(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <App />;
}

AppRegistry.registerComponent(appName, () => Root);

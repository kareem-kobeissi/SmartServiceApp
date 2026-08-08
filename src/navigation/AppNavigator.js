import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import AvailableProvidersScreen from '../screens/AvailableProvidersScreen';
import CreateRequestScreen from '../screens/CreateRequestScreen';
import CustomerHomeScreen from '../screens/CustomerHomeScreen';
import LoginScreen from '../screens/LoginScreen';
import MyRequestsScreen from '../screens/MyRequestsScreen';
import ProviderHomeScreen from '../screens/ProviderHomeScreen';
import ProviderRequestsScreen from '../screens/ProviderRequestsScreen';
import ProviderReviewsScreen from '../screens/ProviderReviewsScreen';
import RatingScreen from '../screens/RatingScreen';
import RegisterScreen from '../screens/RegisterScreen';
import SessionErrorScreen from '../screens/SessionErrorScreen';
import TrackingScreen from '../screens/TrackingScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const {
    isAuthenticated,
    isInitializing,
    restorationError,
    retrySession,
    user,
  } = useAuth();

  if (isInitializing) {
    return <AuthLoadingScreen />;
  }

  if (restorationError) {
    return (
      <SessionErrorScreen
        message={restorationError}
        onRetry={retrySession}
      />
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated && user.role === 'customer' ? (
          <>
            <Stack.Screen
              name="CustomerHome"
              component={CustomerHomeScreen}
            />
            <Stack.Screen
              name="CreateRequest"
              component={CreateRequestScreen}
            />
            <Stack.Screen
              name="MyRequests"
              component={MyRequestsScreen}
            />
            <Stack.Screen
              name="AvailableProviders"
              component={AvailableProvidersScreen}
            />
            <Stack.Screen name="Rating" component={RatingScreen} />
            <Stack.Screen name="Tracking" component={TrackingScreen} />
          </>
        ) : isAuthenticated && user.role === 'provider' ? (
          <>
            <Stack.Screen
              name="ProviderHome"
              component={ProviderHomeScreen}
            />
            <Stack.Screen
              name="ProviderRequests"
              component={ProviderRequestsScreen}
            />
            <Stack.Screen
              name="ProviderReviews"
              component={ProviderReviewsScreen}
            />
            <Stack.Screen name="Tracking" component={TrackingScreen} />

          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

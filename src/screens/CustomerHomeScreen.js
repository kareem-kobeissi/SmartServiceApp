import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import AppButton from '../components/AppButton';
import { colors, radius, shadows, spacing } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function CustomerHomeScreen({ navigation }) {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  async function handleLogout(){setErrorMessage('');setIsLoggingOut(true);try{await logout()}catch{setErrorMessage('Unable to log out. Please try again.');setIsLoggingOut(false)}}
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}><ScrollView contentContainerStyle={[styles.page, { paddingBottom: spacing.extraLarge + insets.bottom }]} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" scrollIndicatorInsets={{ bottom: insets.bottom }}><View style={styles.content}>
    <View style={styles.hero}><View style={styles.avatar}><Text style={styles.avatarText}>{user.fullName?.charAt(0).toUpperCase()}</Text></View><Text style={styles.eyebrow}>CUSTOMER ACCOUNT</Text><Text style={styles.title}>Welcome, {user.fullName}</Text><Text style={styles.subtitle}>What can Smart Service help you with today?</Text></View>
    {errorMessage?<View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.errorMessage}>{errorMessage}</Text></View>:null}
    <View style={styles.actionCard}><View style={styles.actionNumber}><Text style={styles.actionNumberText}>01</Text></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Request a service</Text><Text style={styles.actionText}>Describe your problem, attach your location and find a trusted provider.</Text></View><AppButton disabled={isLoggingOut} label="Request a Service" onPress={()=>navigation.navigate('CreateRequest')}/></View>
    <View style={styles.actionCard}><View style={[styles.actionNumber,styles.secondaryNumber]}><Text style={[styles.actionNumberText,styles.secondaryNumberText]}>02</Text></View><View style={styles.actionCopy}><Text style={styles.actionTitle}>Manage your requests</Text><Text style={styles.actionText}>Follow provider responses, service progress, estimates and ratings.</Text></View><AppButton disabled={isLoggingOut} label="My Requests" onPress={()=>navigation.navigate('MyRequests')} variant="secondary"/></View>
    <AppButton disabled={isLoggingOut} label={isLoggingOut?'Logging Out...':'Logout'} onPress={handleLogout} variant="secondary"/>
  </View></ScrollView></SafeAreaView>;
}

const styles=StyleSheet.create({safeArea:{backgroundColor:colors.background,flex:1},page:{flexGrow:1,justifyContent:'center',paddingHorizontal:spacing.large,paddingTop:spacing.large},content:{alignSelf:'center',gap:spacing.large,maxWidth:680,width:'100%'},hero:{alignItems:'center',backgroundColor:colors.primary,borderRadius:radius.extraLarge,padding:spacing.extraLarge,...shadows.card},avatar:{alignItems:'center',backgroundColor:'rgba(255,255,255,0.18)',borderColor:'rgba(255,255,255,0.3)',borderRadius:radius.large,borderWidth:1,height:64,justifyContent:'center',marginBottom:spacing.medium,width:64},avatarText:{color:colors.white,fontSize:26,fontWeight:'800'},eyebrow:{color:'#bfdbfe',fontSize:11,fontWeight:'800',letterSpacing:1.2},title:{color:colors.white,fontSize:30,fontWeight:'800',letterSpacing:-0.7,marginTop:6,textAlign:'center'},subtitle:{color:'#dbeafe',fontSize:14,lineHeight:21,marginTop:6,textAlign:'center'},actionCard:{backgroundColor:colors.surface,borderColor:colors.borderLight,borderRadius:radius.large,borderWidth:1,gap:spacing.medium,padding:spacing.large,...shadows.small},actionNumber:{alignItems:'center',backgroundColor:colors.primarySoft,borderRadius:radius.medium,height:42,justifyContent:'center',width:42},secondaryNumber:{backgroundColor:colors.accentSoft},actionNumberText:{color:colors.primary,fontSize:12,fontWeight:'800'},secondaryNumberText:{color:colors.accent},actionCopy:{gap:4},actionTitle:{color:colors.text,fontSize:18,fontWeight:'800'},actionText:{color:colors.mutedText,fontSize:13,lineHeight:20},errorBox:{backgroundColor:colors.errorSoft,borderColor:'#fecdca',borderRadius:radius.medium,borderWidth:1,padding:12},errorMessage:{color:colors.error,fontSize:14,textAlign:'center'}});
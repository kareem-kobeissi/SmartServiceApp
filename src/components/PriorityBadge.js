import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../constants/theme';

const priorityStyles = {
  low: { backgroundColor: colors.successSoft, borderColor: '#abefc6', textColor: colors.success },
  medium: { backgroundColor: colors.warningSoft, borderColor: '#fedf89', textColor: colors.warning },
  high: { backgroundColor: colors.orangeSoft, borderColor: '#f9dbaf', textColor: colors.orange },
  emergency: { backgroundColor: colors.errorSoft, borderColor: '#fecdca', textColor: colors.error },
};

export default function PriorityBadge({ level = 'medium', reason }) {
  const palette = priorityStyles[level] || priorityStyles.medium;
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return <View style={styles.container}><View accessibilityLabel={`Priority: ${label}`} style={[styles.badge,{backgroundColor:palette.backgroundColor,borderColor:palette.borderColor}]}><Text style={[styles.badgeText,{color:palette.textColor}]}>{label} priority</Text></View>{reason?<Text style={styles.reason}>{reason}</Text>:null}</View>;
}

const styles=StyleSheet.create({container:{alignItems:'flex-start',gap:spacing.small},badge:{borderRadius:radius.pill,borderWidth:1,paddingHorizontal:11,paddingVertical:5},badgeText:{fontSize:12,fontWeight:'800',letterSpacing:0.2,textTransform:'uppercase'},reason:{color:colors.mutedText,fontSize:13,lineHeight:19}});
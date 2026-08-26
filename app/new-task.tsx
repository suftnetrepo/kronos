import React,{useEffect,useMemo,useState} from 'react'
import {ScrollView,TextInput,Modal} from 'react-native'
import {Stack,StyledPressable,StyledPage,Switch,StyledDatePicker} from 'fluent-styles'
import {useRouter,useLocalSearchParams} from 'expo-router'
import {Text,PremiumIcon,ModalFormHeader} from '../src/components'
import {BellIcon} from '../src/icons/ui'
import {useColors} from '../src/constants'
import {useTasks} from '../src/hooks/useTasks'
import {useSubjects} from '../src/hooks/useSubjects'
import {taskService} from '../src/services/taskService'
import {requestNotificationPermission} from '../src/services/notificationService'
import type {TaskPriority,TaskType} from '../src/db/schema'

const TYPES:[TaskType,any,string,string][]=[
 ['task','tasks','Task','General task'],
 ['homework','book','Homework','School homework'],
 ['study','study','Study','Exam preparation'],
 ['assignment','assignment','Assignment','Course assignment'],
]
const DUE_OPTIONS=[['none','No date'],['today','Today'],['tomorrow','Tomorrow'],['week','7 days'],['custom','Custom']] as const
const PRIORITIES=['normal','medium','high'] as const
const PRIORITY_LABELS:Record<TaskPriority,string>={normal:'Low',medium:'Medium',high:'High'}
type DueMode='none'|'today'|'tomorrow'|'week'|'custom'
type ReminderMode='none'|'1h'|'1d'
const formatCustomDue=(d:Date)=>d.toLocaleString(undefined,{weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})

export default function NewTask(){
 const C=useColors(),r=useRouter(),params=useLocalSearchParams<{id?:string;type?:TaskType;subjectId?:string;examId?:string}>(),{create,update}=useTasks(),{data:subjects}=useSubjects()
 const editing=!!params.id
 const defaultCustomDue=()=>{const d=new Date();d.setHours(18,0,0,0);return d}
 const [ready,setReady]=useState(!editing),[title,setTitle]=useState(''),[type,setType]=useState<TaskType>(params.type||'task'),[priority,setPriority]=useState<TaskPriority>('normal'),[subjectId,setSubjectId]=useState<string|null>(params.subjectId||null),[examId,setExamId]=useState<string|null>(params.examId||null),[notes,setNotes]=useState(''),[due,setDue]=useState<DueMode>('none'),[customDateTime,setCustomDateTime]=useState<Date>(defaultCustomDue),[showCustomPicker,setShowCustomPicker]=useState(false),[reminder,setReminder]=useState<ReminderMode>('none')

 useEffect(()=>{if(!params.id)return;(async()=>{const task=await taskService.getById(params.id!);if(!task){setReady(true);return}setTitle(task.title);setType(task.type as TaskType);setPriority(task.priority as TaskPriority);setSubjectId(task.subjectId);setExamId(task.examId);setNotes(task.notes||'');if(task.dueAt){const d=new Date(task.dueAt);setDue('custom');setCustomDateTime(d);if(task.reminderAt){const mins=Math.round((+d-+new Date(task.reminderAt))/60000);setReminder(mins>=1440?'1d':'1h')}}setReady(true)})()},[params.id])

 const dueAt=useMemo(()=>{if(due==='none')return null;if(due==='custom')return customDateTime;const d=new Date();if(due==='tomorrow')d.setDate(d.getDate()+1);if(due==='week')d.setDate(d.getDate()+7);d.setHours(18,0,0,0);return d},[due,customDateTime])
 const valid=!!title.trim()&&(due!=='custom'||!!dueAt)
 const save=async()=>{if(!valid)return;let reminderAt:Date|null=null;if(dueAt&&reminder!=='none'){const granted=await requestNotificationPermission();if(granted){const mins=reminder==='1d'?1440:60;reminderAt=new Date(+dueAt-mins*60000)}}const input={title:title.trim(),notes:notes.trim()||null,type,subjectId,examId,dueAt,priority,reminderAt};if(params.id)await update(params.id,input);else await create({...input,isCompleted:false,completedAt:null,notificationId:null});r.back()}
 if(!ready)return <StyledPage flex={1} backgroundColor={C.bg}/>

 const priorityColor=(p:TaskPriority)=>p==='high'?C.error:p==='medium'?C.warning:C.success

 return <StyledPage flex={1} backgroundColor={C.bg}>

  {/* Header */}
  <Stack paddingTop={18}><ModalFormHeader title={editing?'Edit Task':'New Task'} onCancel={()=>r.back()} onSave={save} saveDisabled={!valid}/></Stack>

  <ScrollView contentContainerStyle={{paddingHorizontal:20,paddingTop:24,paddingBottom:80}} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

   {/* Type */}
   <Text variant="overline" color={C.textMuted} marginBottom={8}>TYPE</Text>
   <Stack flexDirection="row" flexWrap="wrap" gap={10}>
    {TYPES.map(([key,icon,label,desc])=>{
     const selected=type===key
     return <StyledPressable key={key} width="47.5%" flexDirection="row" alignItems="center" padding={14} borderRadius={16} backgroundColor={selected?C.primary+'12':C.bgCard} borderWidth={1.5} borderColor={selected?C.primary:C.border} onPress={()=>setType(key)}>
      <Stack width={34} height={34} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor={selected?C.primary+'1c':C.bgMuted}><PremiumIcon name={icon} size={16} color={selected?C.primary:C.textSecondary}/></Stack>
      <Stack marginLeft={10} flex={1}>
       <Text variant="label" color={selected?C.primary:C.textPrimary} numberOfLines={1}>{label}</Text>
       <Text variant="caption" color={C.textMuted} numberOfLines={1} marginTop={1}>{desc}</Text>
      </Stack>
     </StyledPressable>
    })}
   </Stack>

   {/* Title */}
   <Text variant="overline" color={C.textMuted} marginTop={24} marginBottom={8}>TITLE *</Text>
   <TextInput
    value={title} onChangeText={setTitle} placeholder="What needs to be done?" placeholderTextColor={C.textMuted}
    style={{backgroundColor:C.bgCard,color:C.textPrimary,borderWidth:1,borderColor:C.border,borderRadius:14,paddingHorizontal:16,paddingVertical:16,fontFamily:'PlusJakartaSans_500Medium',fontSize:15}}
   />

   {/* Subject */}
   <Text variant="overline" color={C.textMuted} marginTop={24} marginBottom={8}>SUBJECT · OPTIONAL</Text>
   <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight:10}}>
    <StyledPressable marginRight={8} paddingHorizontal={14} paddingVertical={9} borderRadius={99} backgroundColor={!subjectId?C.primary:C.bgCard} borderWidth={1} borderColor={!subjectId?C.primary:C.border} onPress={()=>setSubjectId(null)}>
     <Text variant="caption" fontWeight="700" color={!subjectId?C.white:C.textSecondary}>General</Text>
    </StyledPressable>
    {subjects.map(s=>
     <StyledPressable key={s.id} marginRight={8} paddingHorizontal={14} paddingVertical={9} borderRadius={99} backgroundColor={subjectId===s.id?s.color:C.bgCard} borderWidth={1} borderColor={subjectId===s.id?s.color:C.border} onPress={()=>setSubjectId(s.id)}>
      <Text variant="caption" fontWeight="700" color={subjectId===s.id?'#fff':C.textSecondary}>{s.name}</Text>
     </StyledPressable>
    )}
   </ScrollView>

   {/* Due */}
   <Text variant="overline" color={C.textMuted} marginTop={24} marginBottom={8}>DUE</Text>
   <Stack flexDirection="row" flexWrap="wrap" gap={8}>
    {DUE_OPTIONS.map(([key,label])=>{
     const selected=due===key
     return <StyledPressable key={key} flexDirection="row" alignItems="center" paddingHorizontal={14} paddingVertical={10} borderRadius={12} backgroundColor={selected?C.primary:C.bgCard} borderWidth={1} borderColor={selected?C.primary:C.border} onPress={()=>{setDue(key);if(key==='custom')setShowCustomPicker(true)}}>
      {key==='custom'?<PremiumIcon name="calendar" size={13} color={selected?C.white:C.textSecondary}/>:null}
      <Text variant="subLabel" fontWeight="700" marginLeft={key==='custom'?6:0} color={selected?C.white:C.textSecondary}>{label}</Text>
     </StyledPressable>
    })}
   </Stack>
   {due==='custom'?
    <StyledPressable flexDirection="row" alignItems="center" marginTop={10} paddingHorizontal={14} paddingVertical={13} borderRadius={12} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border} onPress={()=>setShowCustomPicker(true)}>
     <PremiumIcon name="calendar" size={15} color={C.primary}/>
     <Text variant="subLabel" fontWeight="700" color={C.textPrimary} marginLeft={9} flex={1}>{formatCustomDue(customDateTime)}</Text>
     <PremiumIcon name="chevron" size={13} color={C.textMuted}/>
    </StyledPressable>
   :null}

   {showCustomPicker?
    <Modal visible transparent animationType="slide" onRequestClose={()=>setShowCustomPicker(false)}>
     <Stack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
      <Stack backgroundColor={C.bgCard} borderTopLeftRadius={24} borderTopRightRadius={24}>
       <Stack flexDirection="row" alignItems="center" justifyContent="space-between" paddingHorizontal={20} paddingVertical={14} borderBottomWidth={1} borderBottomColor={C.border}>
        <StyledPressable onPress={()=>setShowCustomPicker(false)}><Text variant="button" color={C.textMuted}>Cancel</Text></StyledPressable>
        <Text variant="title" color={C.textPrimary}>Due date &amp; time</Text>
        <StyledPressable onPress={()=>setShowCustomPicker(false)}><Text variant="button" color={C.primary}>Done</Text></StyledPressable>
       </Stack>
       <Stack paddingHorizontal={16} paddingBottom={32}>
        <StyledDatePicker
         mode="datetime" variant="inline" value={customDateTime}
         onChange={setCustomDateTime} showTodayButton
         colors={{selected:C.primary,today:C.primary,confirmBg:C.primary}}
        />
       </Stack>
      </Stack>
     </Stack>
    </Modal>
   :null}

   {/* Priority */}
   <Text variant="overline" color={C.textMuted} marginTop={24} marginBottom={8}>PRIORITY</Text>
   <Stack flexDirection="row" gap={8}>
    {PRIORITIES.map(p=>{
     const selected=priority===p,color=priorityColor(p)
     return <StyledPressable key={p} flex={1} flexDirection="row" alignItems="center" justifyContent="center" paddingVertical={11} borderRadius={12} backgroundColor={selected?color+'14':C.bgCard} borderWidth={1.5} borderColor={selected?color:C.border} onPress={()=>setPriority(p)}>
      <Stack width={8} height={8} borderRadius={4} backgroundColor={color} marginRight={7}/>
      <Text variant="subLabel" fontWeight="700" color={selected?color:C.textSecondary}>{PRIORITY_LABELS[p]}</Text>
     </StyledPressable>
    })}
   </Stack>

   {/* Notes */}
   <Text variant="overline" color={C.textMuted} marginTop={24} marginBottom={8}>NOTES</Text>
   <TextInput
    value={notes} onChangeText={setNotes} multiline placeholder="Add details, links, or any notes..." placeholderTextColor={C.textMuted}
    style={{minHeight:90,textAlignVertical:'top',backgroundColor:C.bgCard,color:C.textPrimary,borderWidth:1,borderColor:C.border,borderRadius:14,padding:16,fontFamily:'PlusJakartaSans_400Regular',fontSize:14}}
   />

   {/* Reminder */}
   {due!=='none'?
    <Stack marginTop={24}>
     <Stack flexDirection="row" alignItems="center" padding={14} borderRadius={14} backgroundColor={C.bgCard} borderWidth={1} borderColor={C.border}>
      <Stack width={34} height={34} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor={C.primary+'12'}><BellIcon size={16} color={C.primary} strokeWidth={2}/></Stack>
      <Stack marginLeft={10} flex={1}>
       <Text variant="label" color={C.textPrimary}>Reminder</Text>
       <Text variant="caption" color={C.textMuted} marginTop={1}>Get notified before it's due</Text>
      </Stack>
      <Switch value={reminder!=='none'} onChange={(v:boolean)=>setReminder(v?'1h':'none')}/>
     </Stack>
     {reminder!=='none'?
      <Stack flexDirection="row" gap={8} marginTop={10}>
       {(['1h','1d'] as const).map(key=>{
        const selected=reminder===key
        return <StyledPressable key={key} flex={1} paddingVertical={10} borderRadius={12} alignItems="center" backgroundColor={selected?C.primary:C.bgCard} borderWidth={1} borderColor={selected?C.primary:C.border} onPress={()=>setReminder(key)}>
         <Text variant="subLabel" fontWeight="700" color={selected?C.white:C.textSecondary}>{key==='1h'?'1 hour before':'1 day before'}</Text>
        </StyledPressable>
       })}
      </Stack>
     :null}
    </Stack>
   :null}

  </ScrollView>
 </StyledPage>
}

import React, { useState } from 'react'
import { ScrollView } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { Stack, StyledText, StyledPressable, StyledTextInput } from 'fluent-styles'
import { toastService, loaderService, dialogueService } from 'fluent-styles'
import { useColors } from '../../constants'
import { useSubjects } from '../../hooks'
import { useAppStore } from '../../stores'
import {
  decodeTimetable,
  payloadToSubjects,
} from '../../services/timetableShareService'
import { subjectService } from '../../services/subjectService'

interface ImportTimetableContentProps {
  onDone: () => void
}

export function ImportTimetableContent({ onDone }: ImportTimetableContentProps) {
  const Colors             = useColors()
  const { invalidateData } = useAppStore()
  const { data: existing } = useSubjects()
  const [code, setCode]    = useState('')
  const [error, setError]  = useState('')

  // ── Core import logic ───────────────────────────────────────────────────────
  const performImport = async (rawCode: string) => {
    setError('')
    try {
      const payload  = decodeTimetable(rawCode.trim())
      const incoming = payloadToSubjects(payload)

      if (incoming.length === 0) {
        setError('This timetable has no subjects.')
        return
      }

      // Confirm if user already has subjects
      if (existing.length > 0) {
        const ok = await dialogueService.confirm({
          title:        `Import ${incoming.length} subject${incoming.length !== 1 ? 's' : ''}?`,
          message:      `This will add ${incoming.length} new subject${incoming.length !== 1 ? 's' : ''} to your existing timetable. Your current subjects won't be deleted.`,
          icon:         '📥',
          confirmLabel: 'Import',
          destructive:  false,
        })
        if (!ok) return
      }

      await loaderService.wrap(async () => {
        for (const s of incoming) {
          await subjectService.create({
            ...s,
            sortOrder: 0,
          })
        }
      }, { label: `Importing ${incoming.length} subjects…`, variant: 'spinner' })

      invalidateData()
      toastService.success(
        `Imported ${incoming.length} subject${incoming.length !== 1 ? 's' : ''}!`,
        'Your timetable has been updated'
      )
      onDone()
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Check the code and try again.')
    }
  }

  // ── Paste code handler ──────────────────────────────────────────────────────
  const handleImportCode = () => {
    if (!code.trim()) {
      setError('Paste the code from your classmate first.')
      return
    }
    performImport(code)
  }

  // ── Pick JSON file ──────────────────────────────────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:      'application/json',
        copyToCacheDirectory: true,
      })
      if (result.canceled) return

      const asset   = result.assets[0]
      const content = await FileSystem.readAsStringAsync(asset.uri)

      // Accept either the raw code string or the JSON wrapper we write on share
      let rawCode = content.trim()
      try {
        const parsed = JSON.parse(rawCode)
        if (parsed.kronos && parsed.code) {
          rawCode = parsed.code
        }
      } catch {
        // Not JSON wrapper — treat as raw code
      }

      performImport(rawCode)
    } catch (err: any) {
      toastService.error('Could not read file', err?.message)
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
    >
      <StyledText fontSize={13} color={Colors.textMuted} textAlign="center" marginBottom={20}>
        Paste the code your classmate shared, or pick the .json file they sent you
      </StyledText>

      {/* Paste code input */}
      <Stack gap={8} marginBottom={16}>
        <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted} letterSpacing={0.5}>
          PASTE CODE
        </StyledText>
        <StyledTextInput
          variant="filled"
          placeholder="Paste timetable code here…"
          value={code}
          onChangeText={t => { setCode(t); setError('') }}
          fontSize={13}
          borderRadius={12}
          multiline
          numberOfLines={4}
        />
        {error ? (
          <StyledText fontSize={12} color={Colors.error} fontWeight="600">
            ⚠️ {error}
          </StyledText>
        ) : null}
      </Stack>

      {/* Buttons */}
      <Stack gap={10}>
        <StyledPressable
          horizontal alignItems="center" justifyContent="center" gap={10}
          paddingVertical={14} borderRadius={14}
          backgroundColor={Colors.primary}
          onPress={handleImportCode}
        >
          <StyledText fontSize={16}>📥</StyledText>
          <StyledText fontSize={15} fontWeight="700" color="#fff">
            Import from code
          </StyledText>
        </StyledPressable>

        {/* Divider */}
        <Stack horizontal alignItems="center" gap={10} marginVertical={4}>
          <Stack flex={1} height={1} backgroundColor={Colors.border} />
          <StyledText fontSize={12} color={Colors.textMuted}>or</StyledText>
          <Stack flex={1} height={1} backgroundColor={Colors.border} />
        </Stack>

        <StyledPressable
          horizontal alignItems="center" justifyContent="center" gap={10}
          paddingVertical={14} borderRadius={14}
          backgroundColor={Colors.bgMuted}
          borderWidth={1} borderColor={Colors.border}
          onPress={handlePickFile}
        >
          <StyledText fontSize={16}>📂</StyledText>
          <StyledText fontSize={15} fontWeight="700" color={Colors.textPrimary}>
            Pick .json file
          </StyledText>
        </StyledPressable>
      </Stack>
    </ScrollView>
  )
}

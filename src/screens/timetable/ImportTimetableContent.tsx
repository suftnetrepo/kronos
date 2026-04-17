import React, { useState } from 'react'
import { ScrollView } from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { randomUUID } from 'expo-crypto'
import { Stack, StyledText, StyledPressable, StyledTextInput, StyledDivider } from 'fluent-styles'
import { toastService, loaderService, dialogueService } from 'fluent-styles'
import { useColors } from '../../constants'
import { useSubjects } from '../../hooks'
import { useAppStore } from '../../stores'
import {
  decodeTimetable,
  generateImportPreview,
  payloadToSubjects,
  recordImport,
  type ImportPreview,
  type ImportValidationError,
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
  const [preview, setPreview]     = useState<ImportPreview | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [mergeDuplicates, setMergeDuplicates] = useState(false)  // true = merge, false = skip

  // ── Validate code and show preview ──────────────────────────────────────────
  const handleShowPreview = async () => {
    setError('')
    if (!code.trim()) {
      setError('Paste the code from your classmate first.')
      return
    }

    try {
      const payload = decodeTimetable(code.trim())
      const previewData = generateImportPreview(payload, existing)
      setPreview(previewData)
      setShowPreview(true)
    } catch (err: any) {
      setError(err?.message ?? 'Invalid code. Try again.')
    }
  }

  // ── Handle file pick ────────────────────────────────────────────────────────
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

      setCode(rawCode)
      // Don't auto-preview; let user review before proceeding
      setError('')
    } catch (err: any) {
      toastService.error('Could not read file', err?.message)
    }
  }

  // ── Execute import after preview ────────────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!preview) return

    // Count what will be imported
    const toImport = preview.subjects.filter(s => {
      if (s.status === 'duplicate' && !mergeDuplicates) return false  // Skip duplicates
      if (s.status === 'conflict') return false  // Always skip conflicts
      return true
    })

    if (toImport.length === 0) {
      toastService.warning('Nothing to import', 'All subjects are duplicates or conflicts')
      setShowPreview(false)
      return
    }

    const importId = randomUUID()
    let imported = 0
    let skipped = 0

    try {
      await loaderService.wrap(async () => {
        const payload = decodeTimetable(code.trim())
        const subjects = payloadToSubjects(payload)
        const { duplicates: dupMap } = generateImportPreview(payload, existing).errors
          ? { duplicates: new Map() }
          : require('../../services/timetableShareService').detectDuplicatesAndConflicts(
              payload.ss,
              existing
            )

        const createdIds: string[] = []

        for (let i = 0; i < subjects.length; i++) {
          // Skip if any validation errors for this subject
          const hasErrors = preview.errors.some(e => e.index === i)
          if (hasErrors) {
            skipped++
            continue
          }

          // Skip duplicates if mergeDuplicates is false
          if (dupMap.has(i) && !mergeDuplicates) {
            skipped++
            continue
          }

          // Skip conflicts (always)
          if (dupMap.has(i) && mergeDuplicates) {
            // If merging, we'll create another subject anyway
          } else if (preview.subjects[i]?.status === 'conflict') {
            skipped++
            continue
          }

          try {
            const created = await subjectService.create({
              ...subjects[i],
              sortOrder: 0,
            })
            createdIds.push(created.id)
            imported++
          } catch (err) {
            skipped++
          }
        }

        // Record import for undo capability
        recordImport(importId, createdIds, 'user_import')
      }, { label: `Importing…`, variant: 'spinner' })

      invalidateData()

      // Show summary
      if (imported > 0) {
        toastService.success(
          `Imported ${imported} subject${imported !== 1 ? 's' : ''}`,
          skipped > 0 ? `Skipped ${skipped} (duplicate/conflict)` : 'Your timetable updated!'
        )
      } else {
        toastService.warning('No subjects imported', `Skipped ${skipped} (all were duplicate/conflict)`)
      }

      setShowPreview(false)
      setCode('')
      setPreview(null)
      onDone()
    } catch (err: any) {
      toastService.error('Import failed', err?.message ?? 'Something went wrong')
    }
  }

  // ── Render preview UI ──────────────────────────────────────────────────────
  if (showPreview && preview) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
      >
        {/* Summary */}
        <Stack gap={12} marginBottom={20}>
          <Stack
            paddingVertical={14} paddingHorizontal={16}
            borderRadius={14}
            backgroundColor={preview.valid ? Colors.primary + '10' : Colors.error + '10'}
            borderWidth={1}
            borderColor={preview.valid ? Colors.primary + '30' : Colors.error + '30'}
          >
            <StyledText fontSize={13} fontWeight="700" color={Colors.textPrimary} marginBottom={4}>
              📋 Import Summary
            </StyledText>
            <Stack gap={3}>
              <StyledText fontSize={12} color={Colors.textMuted}>
                Total: {preview.summary.total} subject{preview.summary.total !== 1 ? 's' : ''}
              </StyledText>
              <StyledText fontSize={12} color={Colors.textMuted}>
                New: {preview.summary.new} · Duplicates: {preview.summary.duplicates} · Conflicts: {preview.summary.conflicts}
              </StyledText>
              {preview.summary.invalid > 0 && (
                <StyledText fontSize={12} color={Colors.error} fontWeight="600">
                  Invalid: {preview.summary.invalid}
                </StyledText>
              )}
            </Stack>
          </Stack>
        </Stack>

        {/* Validation errors */}
        {preview.errors.length > 0 && (
          <Stack gap={8} marginBottom={20}>
            <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted}>
              ⚠️ VALIDATION ERRORS ({preview.errors.length})
            </StyledText>
            {preview.errors.map((err, i) => (
              <Stack
                key={i}
                paddingVertical={10} paddingHorizontal={12}
                borderRadius={10}
                backgroundColor={Colors.bgMuted}
                borderLeftWidth={3}
                borderLeftColor={Colors.error}
              >
                <StyledText fontSize={11} fontWeight="600" color={Colors.error}>
                  {err.index >= 0 ? `Subject #${err.index + 1}` : 'Payload'}: {err.field}
                </StyledText>
                <StyledText fontSize={11} color={Colors.textMuted} marginTop={2}>
                  {err.reason}
                </StyledText>
              </Stack>
            ))}
          </Stack>
        )}

        {/* Duplicates warning */}
        {preview.duplicates.length > 0 && (
          <Stack gap={8} marginBottom={20}>
            <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted}>
              🔁 DUPLICATES ({preview.duplicates.length})
            </StyledText>
            {preview.duplicates.map((dup, i) => (
              <Stack key={i} paddingVertical={8} paddingHorizontal={12} borderRadius={10} backgroundColor={Colors.bgMuted}>
                <StyledText fontSize={11} color={Colors.textMuted}>
                  "{dup}" already exists in your timetable
                </StyledText>
              </Stack>
            ))}
            <StyledText fontSize={11} color={Colors.textMuted} marginTop={4}>
              {mergeDuplicates ? '✓ Will import anyway (merge mode)' : '✗ Will be skipped'}
            </StyledText>
          </Stack>
        )}

        {/* Conflicts warning */}
        {preview.conflicts.length > 0 && (
          <Stack gap={8} marginBottom={20}>
            <StyledText fontSize={12} fontWeight="700" color={Colors.warning}>
              ⚡ TIMETABLE CONFLICTS ({preview.conflicts.length})
            </StyledText>
            {preview.conflicts.map((conflict, i) => (
              <Stack key={i} paddingVertical={8} paddingHorizontal={12} borderRadius={10} backgroundColor={Colors.bgMuted}>
                <StyledText fontSize={11} color={Colors.textMuted}>
                  {conflict}
                </StyledText>
              </Stack>
            ))}
            <StyledText fontSize={11} color={Colors.warning} marginTop={4}>
              ⚠️ Conflicting subjects will be skipped (cannot import overlapping times on same days)
            </StyledText>
          </Stack>
        )}

        {/* Subjects list */}
        <Stack gap={8} marginBottom={20}>
          <StyledText fontSize={12} fontWeight="700" color={Colors.textMuted}>
            📚 SUBJECTS ({preview.subjects.length})
          </StyledText>
          {preview.subjects.map((s, i) => (
            <Stack
              key={i}
              paddingVertical={10} paddingHorizontal={12}
              borderRadius={10}
              backgroundColor={
                s.status === 'new'
                  ? Colors.primary + '10'
                  : s.status === 'duplicate'
                  ? Colors.warning + '10'
                  : Colors.error + '10'
              }
            >
              <Stack horizontal alignItems="center" gap={8} marginBottom={4}>
                <StyledText fontSize={11} fontWeight="700" color={Colors.textPrimary} flex={1}>
                  {s.name}
                </StyledText>
                <StyledText
                  fontSize={10}
                  fontWeight="600"
                  paddingHorizontal={8}
                  paddingVertical={2}
                  borderRadius={4}
                  backgroundColor={
                    s.status === 'new'
                      ? Colors.primary
                      : s.status === 'duplicate'
                      ? Colors.warning
                      : Colors.error
                  }
                  color="#fff"
                >
                  {s.status === 'new' ? '+ NEW' : s.status === 'duplicate' ? 'DUP' : 'CONFLICT'}
                </StyledText>
              </Stack>
              <StyledText fontSize={10} color={Colors.textMuted}>
                {s.days} · {s.time}
              </StyledText>
            </Stack>
          ))}
        </Stack>

        {/* Merge toggle (only show if there are duplicates) */}
        {preview.duplicates.length > 0 && (
          <Stack
            paddingVertical={12} paddingHorizontal={14}
            borderRadius={12}
            backgroundColor={Colors.bgCard}
            borderWidth={1}
            borderColor={Colors.border}
            marginBottom={16}
          >
            <Stack horizontal alignItems="center" justifyContent="space-between" gap={12}>
              <Stack flex={1} gap={2}>
                <StyledText fontSize={13} fontWeight="600" color={Colors.textPrimary}>
                  {mergeDuplicates ? '✓' : '✗'} Allow duplicates
                </StyledText>
                <StyledText fontSize={11} color={Colors.textMuted}>
                  {mergeDuplicates ? 'Will create new subjects even if name exists' : 'Skip if name already exists'}
                </StyledText>
              </Stack>
              <StyledPressable
                paddingVertical={6} paddingHorizontal={12}
                borderRadius={8}
                backgroundColor={mergeDuplicates ? Colors.primary : Colors.bgMuted}
                borderWidth={1}
                borderColor={Colors.border}
                onPress={() => setMergeDuplicates(!mergeDuplicates)}
              >
                <StyledText
                  fontSize={12}
                  fontWeight="700"
                  color={mergeDuplicates ? '#fff' : Colors.textPrimary}
                >
                  {mergeDuplicates ? 'ON' : 'OFF'}
                </StyledText>
              </StyledPressable>
            </Stack>
          </Stack>
        )}

        {/* Action buttons */}
        <Stack gap={10}>
          <StyledPressable
            flexDirection="row" alignItems="center" justifyContent="center" gap={10}
            paddingVertical={14} borderRadius={14}
            backgroundColor={preview.valid && preview.summary.new > 0 ? Colors.primary : Colors.primary + '60'}
            onPress={handleConfirmImport}
            disabled={!preview.valid || preview.summary.new === 0}
          >
            <StyledText fontSize={15} fontWeight="700" color="#fff">↓</StyledText>
            <StyledText fontSize={15} fontWeight="700" color="#fff">
              Import {preview.summary.new} subject{preview.summary.new !== 1 ? 's' : ''}
            </StyledText>
          </StyledPressable>

          <StyledPressable
            flexDirection="row" alignItems="center" justifyContent="center" gap={10}
            paddingVertical={12} borderRadius={14}
            backgroundColor={Colors.bgMuted}
            borderWidth={1} borderColor={Colors.border}
            onPress={() => {
              setShowPreview(false)
              setPreview(null)
            }}
          >
            <StyledText fontSize={15} fontWeight="700" color={Colors.textPrimary}>
              Cancel
            </StyledText>
          </StyledPressable>
        </Stack>
      </ScrollView>
    )
  }

  // ── Render input UI ────────────────────────────────────────────────────────
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
          flexDirection="row" alignItems="center" justifyContent="center" gap={10}
          paddingVertical={14} borderRadius={14}
          backgroundColor={Colors.primary}
          onPress={handleShowPreview}
        >
          <StyledText fontSize={15} fontWeight="700" color="#fff">👁</StyledText>
          <StyledText fontSize={15} fontWeight="700" color="#fff">
            Preview
          </StyledText>
        </StyledPressable>

        {/* Divider */}
        <Stack horizontal alignItems="center" gap={10} marginVertical={4}>
          <Stack flex={1} height={1} backgroundColor={Colors.border} />
          <StyledText fontSize={12} color={Colors.textMuted}>or</StyledText>
          <Stack flex={1} height={1} backgroundColor={Colors.border} />
        </Stack>

        <StyledPressable
          flexDirection="row" alignItems="center" justifyContent="center" gap={10}
          paddingVertical={14} borderRadius={14}
          backgroundColor={Colors.bgMuted}
          borderWidth={1} borderColor={Colors.border}
          onPress={handlePickFile}
        >
          <StyledText fontSize={15} fontWeight="700" color={Colors.textPrimary}>📁</StyledText>
          <StyledText fontSize={15} fontWeight="700" color={Colors.textPrimary}>
            Pick .json file
          </StyledText>
        </StyledPressable>
      </Stack>
    </ScrollView>
  )
}

import React, { useEffect, useState, useRef } from 'react'
import { ScrollView, Share, Platform } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import QRCode from 'react-native-qrcode-svg'
import { Stack, StyledText, StyledPressable } from 'fluent-styles'
import { toastService, loaderService } from 'fluent-styles'
import { useColors } from '../../constants'
import { useSubjects } from '../../hooks'
import { encodeTimetable } from '../../services/timetableShareService'

export function ShareTimetableContent() {
  const Colors           = useColors()
  const { data: subjects } = useSubjects()
  const [code, setCode]  = useState<string>('')
  const qrRef            = useRef<any>(null)

  useEffect(() => {
    if (subjects.length > 0) {
      setCode(encodeTimetable(subjects))
    }
  }, [subjects])

  // ── Copy code to clipboard ──────────────────────────────────────────────────
  const handleCopyCode = async () => {
    if (!code) return
    await Clipboard.setStringAsync(code)
    toastService.success('Code copied!', 'Send it to your classmate to import')
  }

  // ── Share as JSON file ──────────────────────────────────────────────────────
  const handleShareFile = async () => {
    if (!code) return
    try {
      await loaderService.wrap(async () => {
        const path = FileSystem.cacheDirectory + 'kronos-timetable.json'
        await FileSystem.writeAsStringAsync(path, JSON.stringify({
          kronos: true,
          code,
          subjects: subjects.length,
          exported: new Date().toISOString(),
        }, null, 2))

        const canShare = await Sharing.isAvailableAsync()
        if (canShare) {
          await Sharing.shareAsync(path, {
            mimeType: 'application/json',
            dialogTitle: 'Share your Kronos timetable',
          })
        } else {
          // Fallback to native Share sheet (text)
          await Share.share({
            message: code,
            title:   'My Kronos Timetable',
          })
        }
      }, { label: 'Preparing…', variant: 'spinner' })
    } catch (err: any) {
      toastService.error('Share failed', err?.message)
    }
  }

  if (subjects.length === 0) {
    return (
      <Stack alignItems="center" paddingVertical={32} gap={8}>
        <StyledText fontSize={32}>📭</StyledText>
        <StyledText fontSize={15} fontWeight="700" color={Colors.textPrimary}>
          No subjects yet
        </StyledText>
        <StyledText fontSize={13} color={Colors.textMuted} textAlign="center">
          Add some subjects to your timetable first
        </StyledText>
      </Stack>
    )
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
    >
      {/* Subject count */}
      <StyledText fontSize={13} color={Colors.textMuted} textAlign="center" marginBottom={20}>
        {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · your classmate can scan or paste the code below
      </StyledText>

      {/* QR code */}
      <Stack alignItems="center" marginBottom={24}>
        <Stack
          padding={16} borderRadius={20}
          backgroundColor="#fff"
          borderWidth={1} borderColor={Colors.border}
          style={{
            shadowColor:   '#000',
            shadowOffset:  { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius:  12,
            elevation:     4,
          }}
        >
          {code ? (
            <QRCode
              value={code}
              size={200}
              color="#111827"
              backgroundColor="#fff"
              ref={qrRef}
            />
          ) : (
            <Stack width={200} height={200} alignItems="center" justifyContent="center">
              <StyledText fontSize={13} color={Colors.textMuted}>Generating…</StyledText>
            </Stack>
          )}
        </Stack>
      </Stack>

      {/* Code preview */}
      <Stack
        paddingHorizontal={14} paddingVertical={10}
        borderRadius={12} backgroundColor={Colors.bgInput}
        marginBottom={16}
      >
        <StyledText
          fontSize={11} color={Colors.textMuted}
          numberOfLines={2}
          style={{ fontFamily: 'monospace' }}
        >
          {code ? code.slice(0, 80) + '…' : ''}
        </StyledText>
      </Stack>

      {/* Action buttons */}
      <Stack gap={10}>
        <StyledPressable
          flexDirection="row" alignItems="center" justifyContent="center" gap={10}
          paddingVertical={14} borderRadius={14}
          backgroundColor={Colors.primary}
          onPress={handleCopyCode}
        >
          <StyledText fontSize={15} fontWeight="700" color="#fff">📋</StyledText>
          <StyledText fontSize={15} fontWeight="700" color="#fff">
            Copy code
          </StyledText>
        </StyledPressable>

        <StyledPressable
          flexDirection="row" alignItems="center" justifyContent="center" gap={10}
          paddingVertical={14} borderRadius={14}
          backgroundColor={Colors.bgMuted}
          borderWidth={1} borderColor={Colors.border}
          onPress={handleShareFile}
        >
          <StyledText fontSize={15} fontWeight="700" color={Colors.textPrimary}>📤</StyledText>
          <StyledText fontSize={15} fontWeight="700" color={Colors.textPrimary}>
            Share file
          </StyledText>
        </StyledPressable>
      </Stack>
    </ScrollView>
  )
}

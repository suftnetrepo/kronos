import React from 'react'
import { Stack, StyledText, StyledPressable } from 'fluent-styles'

interface State {
  hasError:   boolean
  error:      Error | null
}

interface Props {
  children: React.ReactNode
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Kronos ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <Stack flex={1} backgroundColor="#F5F5F7" alignItems="center" justifyContent="center" padding={32} gap={16}>
        <StyledText fontSize={48}>😵</StyledText>
        <StyledText fontSize={20} fontWeight="800" color="#111827" textAlign="center">
          Something went wrong
        </StyledText>
        <StyledText fontSize={14} color="#6B7280" textAlign="center" lineHeight={22}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </StyledText>
        <StyledPressable
          marginTop={8} paddingVertical={14} paddingHorizontal={32}
          borderRadius={30} backgroundColor="#6366F1"
          onPress={this.handleReset}
        >
          <StyledText fontSize={15} fontWeight="700" color="#fff">Try again</StyledText>
        </StyledPressable>
      </Stack>
    )
  }
}

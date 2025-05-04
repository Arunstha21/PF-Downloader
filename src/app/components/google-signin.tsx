"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface GoogleSignInProps {
  onSignedIn: () => void
}

export default function GoogleSignIn({ onSignedIn }: GoogleSignInProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is already signed in
    const checkSignIn = async () => {
      try {
        const isSignedIn = await window.electron?.isSignedIn()
        if (isSignedIn) {
          const userInfo = await window.electron?.getUserInfo()
          if (userInfo && userInfo.success) {
            onSignedIn()
          }
        }
      } catch (err) {
        console.error("Failed to check sign-in status:", err)
      }
    }

    checkSignIn()
  }, [onSignedIn])

  const handleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electron?.signIn()
      if (result && result.success) {
        const userInfo = await window.electron?.getUserInfo()
        if (userInfo && userInfo.success) {
          onSignedIn()
        }
      } else if (result && result.error) {
        setError(result.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Sign in with Google</CardTitle>
        <CardDescription>
          Sign in with your Google account to download files from Google Drive
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          className="w-full flex items-center justify-center space-x-2"
          onClick={handleSignIn}
          disabled={isLoading}
        >
          <span>{isLoading ? "Signing in..." : "Sign in with Google"}</span>
        </Button>
      </CardContent>
      <CardFooter className="text-center text-sm text-muted-foreground">
        Your Google account will be used to access files in Google Drive
      </CardFooter>
    </Card>
  )
}
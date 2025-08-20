import React, { useMemo } from 'react'

export default function WordDiffHighlight({ target, recognized }: { target: string; recognized: string }) {
  const parts = useMemo(() => {
    const toTokens = (s: string) => s
      .toLowerCase()
      .replace(/[^a-z\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean)

    const originalWords = (target || '').split(/(\s+)/) // keep spaces

    const refTokens: string[] = []
    const refTokenIndexForWord: (number | null)[] = []
    for (const seg of originalWords) {
      if (/\s+/.test(seg)) {
        refTokenIndexForWord.push(null)
      } else {
        const norm = seg.toLowerCase().replace(/[^a-z']/g, '')
        if (norm) {
          refTokens.push(norm)
          refTokenIndexForWord.push(refTokens.length - 1)
        } else {
          refTokenIndexForWord.push(null)
        }
      }
    }

    const hypTokens = toTokens(recognized || '')

    // LCS DP
    const m = refTokens.length
    const n = hypTokens.length
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0))
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (refTokens[i - 1] === hypTokens[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
    // Backtrack to mark matches on ref side
    const matchedRef: boolean[] = Array(m).fill(false)
    let i = m, j = n
    while (i > 0 && j > 0) {
      if (refTokens[i - 1] === hypTokens[j - 1]) {
        matchedRef[i - 1] = true
        i--; j--
      } else if (dp[i - 1][j] >= dp[i][j - 1]) i--
      else j--
    }

    // Project back to original words incl. spaces
    const result: { word: string; matched: boolean }[] = []
    for (let w = 0; w < originalWords.length; w++) {
      const seg = originalWords[w]
      if (/\s+/.test(seg)) {
        result.push({ word: seg, matched: true })
      } else {
        const tokenIndex = refTokenIndexForWord[w]
        if (tokenIndex === null || tokenIndex === undefined) {
          result.push({ word: seg, matched: true })
        } else {
          result.push({ word: seg, matched: !!matchedRef[tokenIndex] })
        }
      }
    }
    return result
  }, [target, recognized])

  if (!target) return null
  return (
    <div className="text-sm leading-6">
      {parts.map((p, i) => (
        /\s+/.test(p.word) ? (
          <span key={i}>{p.word}</span>
        ) : (
          <span
            key={i}
            className={
              (p.matched
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
              ) + ' px-1 rounded'}
          >
            {p.word}
          </span>
        )
      ))}
    </div>
  )
}


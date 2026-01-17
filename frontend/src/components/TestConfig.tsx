import { useTypingStore, TimeOption, WordsOption } from '../stores/typingStore'

export default function TestConfig() {
  const { 
    mode, 
    setMode, 
    timeOption, 
    setTimeOption, 
    wordsOption, 
    setWordsOption,
    resetTest 
  } = useTypingStore()

  const timeOptions: TimeOption[] = [15, 30, 60, 120]
  const wordsOptions: WordsOption[] = [10, 25, 50, 100]

  const handleModeChange = (newMode: 'time' | 'words' | 'quote') => {
    setMode(newMode)
    resetTest()
  }

  const handleTimeChange = (option: TimeOption) => {
    setTimeOption(option)
    resetTest()
  }

  const handleWordsChange = (option: WordsOption) => {
    setWordsOption(option)
    resetTest()
  }

  return (
    <div className="flex items-center justify-center gap-8 mb-8 p-4 bg-bg-secondary rounded-lg">
      {/* Mode Selection */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleModeChange('time')}
          className={`px-3 py-1 rounded transition-colors ${
            mode === 'time' ? 'text-main' : 'text-sub hover:text-text'
          }`}
        >
          time
        </button>
        <button
          onClick={() => handleModeChange('words')}
          className={`px-3 py-1 rounded transition-colors ${
            mode === 'words' ? 'text-main' : 'text-sub hover:text-text'
          }`}
        >
          words
        </button>
        <button
          onClick={() => handleModeChange('quote')}
          className={`px-3 py-1 rounded transition-colors ${
            mode === 'quote' ? 'text-main' : 'text-sub hover:text-text'
          }`}
        >
          quote
        </button>
      </div>

      <div className="w-px h-6 bg-sub" />

      {/* Time/Words Options */}
      {mode === 'time' && (
        <div className="flex items-center gap-4">
          {timeOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleTimeChange(option)}
              className={`px-3 py-1 rounded transition-colors ${
                timeOption === option ? 'text-main' : 'text-sub hover:text-text'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {mode === 'words' && (
        <div className="flex items-center gap-4">
          {wordsOptions.map((option) => (
            <button
              key={option}
              onClick={() => handleWordsChange(option)}
              className={`px-3 py-1 rounded transition-colors ${
                wordsOption === option ? 'text-main' : 'text-sub hover:text-text'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {mode === 'quote' && (
        <span className="text-sub">random quotes</span>
      )}
    </div>
  )
}

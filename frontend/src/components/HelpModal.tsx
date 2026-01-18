import React from 'react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

interface ShortcutItemProps {
  shortcut: string
  description: string
}

function ShortcutItem({ shortcut, description }: ShortcutItemProps) {
  return (
    <div className="flex items-center gap-3 bg-vim-bg rounded-lg p-3">
      <kbd className="bg-vim-overlay px-3 py-1.5 rounded text-vim-green font-mono text-sm font-semibold min-w-[80px] text-center">
        {shortcut}
      </kbd>
      <span className="text-vim-subtext text-sm">{description}</span>
    </div>
  )
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="bg-vim-surface rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-vim-overlay">
        {/* Header */}
        <div className="sticky top-0 bg-vim-surface border-b border-vim-overlay px-6 py-4 flex items-center justify-between">
          <h2 id="help-modal-title" className="text-2xl font-bold text-vim-green">Keyboard Shortcuts & Vim Motions</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-vim-subtext hover:text-vim-red transition-colors text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* General Shortcuts Section */}
          <section>
            <h3 className="text-xl font-semibold text-vim-text mb-4 flex items-center gap-2">
              <span className="text-vim-yellow">⌨️</span>
              General Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ShortcutItem shortcut="?" description="Toggle this help modal" />
              <ShortcutItem shortcut="Esc" description="Close help modal / return to game" />
              <ShortcutItem shortcut="Enter" description="Start/restart typing test" />
            </div>
          </section>

          {/* Vim Motions Section */}
          <section>
            <h3 className="text-xl font-semibold text-vim-text mb-4 flex items-center gap-2">
              <span className="text-vim-blue">📝</span>
              Vim Navigation Motions
            </h3>
            
            {/* Basic Movement */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-vim-green mb-3">Basic Movement</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="h" description="Move cursor left" />
                <ShortcutItem shortcut="j" description="Move cursor down" />
                <ShortcutItem shortcut="k" description="Move cursor up" />
                <ShortcutItem shortcut="l" description="Move cursor right" />
                <ShortcutItem shortcut="←↓↑→" description="Arrow keys also work" />
              </div>
            </div>

            {/* Word Motions */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-vim-green mb-3">Word Motions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="w" description="Move to start of next word" />
                <ShortcutItem shortcut="b" description="Move to start of previous word" />
                <ShortcutItem shortcut="e" description="Move to end of current/next word" />
                <ShortcutItem shortcut="W" description="Move to next WORD (space-delimited)" />
                <ShortcutItem shortcut="B" description="Move to previous WORD" />
                <ShortcutItem shortcut="E" description="Move to end of WORD" />
              </div>
            </div>

            {/* Line Navigation */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-vim-green mb-3">Line Navigation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="0" description="Move to start of line" />
                <ShortcutItem shortcut="^" description="Move to first non-blank character" />
                <ShortcutItem shortcut="$" description="Move to end of line" />
              </div>
            </div>

            {/* Find Character */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-vim-green mb-3">Find Character</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="f{char}" description="Find next character on line" />
                <ShortcutItem shortcut="F{char}" description="Find previous character on line" />
                <ShortcutItem shortcut="t{char}" description="Move till (before) next character" />
                <ShortcutItem shortcut="T{char}" description="Move till (after) previous character" />
              </div>
            </div>

            {/* Document Navigation */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-vim-green mb-3">Document Navigation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="gg" description="Go to first line of document" />
                <ShortcutItem shortcut="G" description="Go to last line of document" />
              </div>
            </div>

            {/* Paragraph Motions */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-vim-green mb-3">Paragraph Motions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="{" description="Jump to previous paragraph/block" />
                <ShortcutItem shortcut="}" description="Jump to next paragraph/block" />
              </div>
            </div>

            {/* Bracket Matching */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-vim-green mb-3">Bracket Matching</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <ShortcutItem shortcut="%" description="Jump to matching bracket/parenthesis" />
              </div>
            </div>
          </section>

          {/* Pro Tip */}
          <section className="bg-vim-overlay/30 rounded-lg p-4 border border-vim-overlay">
            <p className="text-vim-subtext text-sm">
              <span className="text-vim-yellow font-semibold">💡 Pro Tip:</span> Many Vim motions can be prefixed with a count (e.g., <kbd className="bg-vim-surface px-2 py-1 rounded text-vim-green text-xs">5j</kbd> moves down 5 lines, <kbd className="bg-vim-surface px-2 py-1 rounded text-vim-green text-xs">3w</kbd> moves forward 3 words).
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

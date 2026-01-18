import { Link } from 'react-router-dom'

export default function Home() {
  const features = [
    {
      icon: 'Keyboard',
      title: 'Navigation',
      description: 'Practice essential Vim navigation commands like h, j, k, l, w, b, f, and more',
    },
    {
      icon: 'Target',
      title: 'Target Practice',
      description: 'Navigate to highlighted targets in real code as fast as possible',
    },
    {
      icon: 'Stats',
      title: 'Track Progress',
      description: 'Monitor your speed improvements across different languages',
    },
    {
      icon: 'Code',
      title: 'Real Code',
      description: 'Practice with actual code snippets in Python, JavaScript, Rust, and more',
    },
  ]

  const commands = [
    { key: 'h/left j/down k/up l/right', desc: 'Basic movement' },
    { key: 'w b e', desc: 'Word motions' },
    { key: '0 ^ $', desc: 'Line navigation' },
    { key: 'gg G', desc: 'Document navigation' },
    { key: 'f F t T', desc: 'Find character' },
  ]

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold text-vim-text mb-4">
          Typ<span className="text-vim-green">race</span>
        </h1>
        <p className="text-xl text-vim-subtext mb-8 max-w-2xl mx-auto">
          Improve your typing speed, coding writing, and Vim navigation through
          personalized practice texts and challenges.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            to="/play"
            className="bg-vim-green text-vim-bg px-8 py-4 rounded-lg font-bold text-lg hover:bg-vim-green/90 transition-colors"
          >
            Start Racing
          </Link>
          <Link
            to="/register"
            className="border border-vim-overlay text-vim-text px-8 py-4 rounded-lg font-medium text-lg hover:bg-vim-surface transition-colors"
          >
            Create Account
          </Link>
        </div>
      </section>

      {/* Demo Preview */}
      <section className="bg-vim-surface rounded-xl p-6 border border-vim-overlay">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-vim-red"></div>
          <div className="w-3 h-3 rounded-full bg-vim-yellow"></div>
          <div className="w-3 h-3 rounded-full bg-vim-green"></div>
          <span className="ml-2 text-vim-subtext text-sm">typrace</span>
        </div>
        <pre className="text-sm leading-relaxed">
          <code>
            <span className="text-vim-purple">def</span>{' '}
            <span className="text-vim-blue">fibonacci</span>
            <span className="text-vim-text">(n):</span>
            {'\n'}
            <span className="text-vim-text">    </span>
            <span className="text-vim-purple">if</span>{' '}
            <span className="text-vim-text">n {'<='} </span>
            <span className="text-vim-yellow">1</span>
            <span className="text-vim-text">:</span>
            {'\n'}
            <span className="text-vim-text">        </span>
            <span className="text-vim-purple">return</span>{' '}
            <span className="text-vim-text">n</span>
            {'\n'}
            <span className="text-vim-text">    </span>
            <span className="text-vim-purple">return</span>{' '}
            <span className="bg-vim-cursor text-vim-bg">f</span>
            <span className="text-vim-text">ibonacci(n-1) + </span>
            <span className="bg-vim-green/30 text-vim-green">f</span>
            <span className="text-vim-text">ibonacci(n-2)</span>
          </code>
        </pre>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-vim-green">NORMAL</span>
          <span className="text-vim-subtext">
            Navigate from cursor to <span className="text-vim-green">target</span> using{' '}
            <kbd className="bg-vim-bg px-2 py-1 rounded">f</kbd> motion
          </span>
        </div>
      </section>

      {/* (Removed: Features and Quick Reference sections) */}

      {/* CTA */}
      <section className="text-center py-8">
        <p className="text-vim-subtext mb-4">Ready to improve your skills?</p>
        <Link
          to="/play"
          className="inline-flex items-center gap-2 bg-vim-green text-vim-bg px-8 py-4 rounded-lg font-bold text-lg hover:bg-vim-green/90 transition-colors"
        >
          <span>Start Improving!</span>
          <span>→</span>
        </Link>
      </section>
    </div>
  )
}

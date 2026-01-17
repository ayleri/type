import { Link } from 'react-router-dom'

export default function Home() {
  const features = [
    {
      icon: '⌨️',
      title: 'Vim Motions',
      description: 'Practice essential Vim navigation commands like h, j, k, l, w, b, f, and more',
    },
    {
      icon: '🎯',
      title: 'Target Practice',
      description: 'Navigate to highlighted targets in real code as fast as possible',
    },
    {
      icon: '📊',
      title: 'Track Progress',
      description: 'Monitor your speed improvements across different languages',
    },
    {
      icon: '💻',
      title: 'Real Code',
      description: 'Practice with actual code snippets in Python, JavaScript, Rust, and more',
    },
  ]

  const commands = [
    { key: 'h j k l', desc: 'Basic movement' },
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
          Master <span className="text-vim-green">Vim</span> Motions
        </h1>
        <p className="text-xl text-vim-subtext mb-8 max-w-2xl mx-auto">
          Race against time to navigate code using Vim commands. 
          Improve your editing speed and become a Vim power user.
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
          <span className="ml-2 text-vim-subtext text-sm">vim-racer</span>
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

      {/* Features */}
      <section>
        <h2 className="text-2xl font-bold text-vim-text text-center mb-8">Why Vim Racer?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-vim-surface p-6 rounded-xl border border-vim-overlay hover:border-vim-green/50 transition-colors"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-vim-text mb-2">{feature.title}</h3>
              <p className="text-vim-subtext text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Command Reference */}
      <section className="bg-vim-surface rounded-xl p-8 border border-vim-overlay">
        <h2 className="text-2xl font-bold text-vim-text mb-6">Quick Reference</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {commands.map((cmd, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <kbd className="bg-vim-bg px-3 py-2 rounded text-vim-green font-mono min-w-[100px] text-center">
                {cmd.key}
              </kbd>
              <span className="text-vim-subtext">{cmd.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <p className="text-vim-subtext mb-4">Ready to level up your Vim skills?</p>
        <Link
          to="/play"
          className="inline-flex items-center gap-2 bg-vim-green text-vim-bg px-8 py-4 rounded-lg font-bold text-lg hover:bg-vim-green/90 transition-colors"
        >
          <span>Start Racing</span>
          <span>→</span>
        </Link>
      </section>
    </div>
  )
}

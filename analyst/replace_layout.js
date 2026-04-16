const fs = require("fs");
const file = "src/components/chat/ChatPanel.tsx";
let content = fs.readFileSync(file, "utf8");

const lines = content.split("\n");
const returnLine = 182;
const header = lines.slice(0, returnLine).join("\n");

const newLayout = `
  const hasMessages = messages.length > 0;

  return (
    <>
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}
      <div className="flex h-full overflow-hidden bg-surface-1">

        {/* LEFT — Query Panel */}
        <div className="w-64 flex-shrink-0 border-r border-white/10 bg-white/30 dark:bg-white/5 backdrop-blur-xl flex flex-col">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Research query</p>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-3 overflow-y-auto">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <textarea
                ref={inputRef} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
                placeholder={isListening ? 'Listening... speak now' : 'Enter your research question...'}
                rows={4}
                className={cn(
                  'w-full resize-none rounded-xl border bg-white/70 dark:bg-white/5 px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all',
                  isListening ? 'border-red-400/50 animate-pulse' : 'border-white/20'
                )}
                style={{ minHeight: '90px' }}
                onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px'; }}
              />
              <div className="flex gap-2">
                {isLoading
                  ? <button type="button" onClick={stop} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-all"><Square size={12} /> Stop</button>
                  : <button type="submit" disabled={!input.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-40 shadow-md transition-all"><Play size={12} /> Run analysis</button>
                }
                {isSupported && (
                  <button type="button" onClick={() => isListening ? stopListening() : startListening()}
                    className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border',
                      isListening ? 'bg-red-500 text-white border-red-500' : 'bg-white/60 dark:bg-white/10 border-white/20 text-gray-500 hover:text-brand-500'
                    )}>
                    {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                )}
              </div>
            </form>

            {!hasMessages && (
              <>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1">Quick prompts</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button key={s}
                      onClick={() => { handleInputChange({ target: { value: s } } as React.ChangeEvent<HTMLTextAreaElement>); inputRef.current?.focus(); }}
                      className="text-left text-xs px-3 py-2 rounded-lg border border-white/20 bg-white/40 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:border-brand-500/50 hover:text-brand-600 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mt-auto pt-2">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Active tools</p>
              <div className="flex flex-col gap-1.5">
                {settings.enableRAG && activeTools.ragSearch && <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Database size={11} className="text-brand-500" /> Document search</div>}
                {settings.enableWebSearch && activeTools.webSearch && <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><Globe size={11} className="text-emerald-500" /> Web search</div>}
                {activeTools.generateReport && <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400"><FileText size={11} className="text-amber-500" /> Report generation</div>}
              </div>
            </div>

            <div className="rounded-lg border border-white/20 bg-white/40 dark:bg-white/5 px-3 py-2">
              <p className="text-[10px] text-gray-400">{settings.modelId} · {settings.personality}</p>
              {isSupported && <p className="text-[10px] text-brand-500 mt-0.5">Voice ready</p>}
            </div>
          </div>
        </div>

        {/* RIGHT — Results Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-white/10 bg-white/20 dark:bg-white/3">
            <div className="h-2 w-2 rounded-full bg-brand-500" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Analysis output</p>
            {hasMessages && <span className="text-xs text-gray-400 truncate max-w-xs">— {messages[0]?.content?.slice(0, 50)}</span>}
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => setShowOnboarding(true)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 transition-colors" title="Help">
                <HelpCircle size={14} />
              </button>
              {hasMessages && (
                <button onClick={() => { setMessages([]); setThinkingSteps([]); }}
                  className="text-xs px-3 py-1 rounded-lg border border-white/20 text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-all">
                  Clear
                </button>
              )}
            </div>
          </div>

          {(thinkingSteps.length > 0 || isLoading) && (
            <div className="px-5 border-b border-white/10 bg-white/10 dark:bg-white/3 flex items-center gap-2 flex-wrap py-2 text-xs">
              {thinkingSteps.map((step, i) => (
                <span key={i} className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 size={11} />{step}
                  {i < thinkingSteps.length - 1 && <span className="text-gray-300 ml-1">·</span>}
                </span>
              ))}
              {isLoading && (
                <span className="flex items-center gap-1 text-brand-500 animate-pulse">
                  {thinkingSteps.length > 0 && <span className="text-gray-300">·</span>}
                  <Loader2 size={11} className="animate-spin" /> Synthesising...
                </span>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {!hasMessages ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                  <Sparkles size={24} className="text-brand-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    Your AI Research Analyst
                  </h2>
                  <p className="mt-2 text-sm text-gray-400 max-w-sm leading-relaxed">
                    Enter a research question in the query panel to get structured analysis, insights, and sources.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2 max-w-md">
                  {[
                    { icon: <Database size={14} />, label: 'Document search', color: 'text-brand-500' },
                    { icon: <Globe size={14} />, label: 'Web research', color: 'text-emerald-500' },
                    { icon: <FileText size={14} />, label: 'Report export', color: 'text-amber-500' },
                  ].map(f => (
                    <div key={f.label} className="rounded-xl border border-white/20 bg-white/40 dark:bg-white/5 p-3 text-center">
                      <div className={cn('flex justify-center mb-1', f.color)}>{f.icon}</div>
                      <p className="text-xs text-gray-500">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-5 py-4 space-y-4 max-w-3xl mx-auto w-full">
                {messages.map((message) => (
                  <div key={message.id} className={cn('animate-fade-in', message.role === 'user' ? 'flex justify-end' : 'block')}>
                    {message.role === 'user' ? (
                      <div className="max-w-sm">
                        <p className="text-[10px] text-gray-400 mb-1 text-right uppercase tracking-wide">Query</p>
                        <div className="rounded-2xl rounded-tr-sm bg-gradient-to-r from-brand-500 to-purple-500 px-4 py-3 text-sm text-white shadow-md">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <div className="group">
                        <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide">
                          <Sparkles size={9} className="text-brand-500" /> Analysis result
                        </p>
                        <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl px-5 py-4">
                          <div className="prose-chat text-sm leading-relaxed">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                          </div>
                        </div>
                        {message.content && (
                          <div className="mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                            <button onClick={() => { navigator.clipboard.writeText(message.content); toast.success('Copied'); }}
                              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-400 hover:text-brand-500 hover:bg-brand-500/10 transition-all">
                              <Copy size={10} /> Copy
                            </button>
                            <button onClick={() => submitFeedback(message.id, 'up')}
                              className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all', feedback[message.id] === 'up' ? 'text-green-500 bg-green-500/10' : 'text-gray-400 hover:text-green-500 hover:bg-green-500/10')}>
                              <ThumbsUp size={10} /> Helpful
                            </button>
                            <button onClick={() => submitFeedback(message.id, 'down')}
                              className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all', feedback[message.id] === 'down' ? 'text-red-500 bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10')}>
                              <ThumbsDown size={10} /> Not helpful
                            </button>
                            <span className="ml-2 text-[10px] text-gray-400">via {settings.modelId}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="animate-fade-in">
                    <p className="text-[10px] text-gray-400 mb-2 flex items-center gap-1 uppercase tracking-wide">
                      <Sparkles size={9} className="text-brand-500 animate-pulse" /> Analysing
                    </p>
                    <div className="rounded-2xl border border-white/20 bg-white/60 dark:bg-white/5 backdrop-blur-xl px-5 py-4">
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse" />
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse [animation-delay:0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-pulse [animation-delay:0.3s]" />
                        <span className="ml-1">Processing your research query...</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600">
                    <AlertCircle size={14} />
                    <span>{error.message || 'Something went wrong.'}</span>
                    <button onClick={() => reload()} className="ml-auto flex items-center gap-1 text-xs font-medium">
                      <RotateCcw size={11} /> Retry
                    </button>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
`;

const newContent = header + newLayout;
fs.writeFileSync(file, newContent);
const newLines = newContent.split("\n").length;
console.log("Done! New file has", newLines, "lines");
console.log("Has split layout:", newContent.indexOf("Research query") > -1);
console.log("Has Run analysis:", newContent.indexOf("Run analysis") > -1);

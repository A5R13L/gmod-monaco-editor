import React, { useState, useEffect, useMemo, useCallback } from "react";
import { vfs } from "../glua/gmodInterface";
import { useSessions } from "../contexts/SessionsContext";
import { useEditor } from "../contexts/EditorContext";
import { gmodInterface } from "../glua/gmodInterface";
import "./Search.scss";
import { cn } from "../utils";

export interface SearchResult {
    file: string;
    line: number;
    column: number;
    match: string;
    lineContent: string;
    isOpenEditor: boolean;
}

export const Search: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [includeGlob, setIncludeGlob] = useState("");
    const [excludeGlob, setExcludeGlob] = useState("");
    const [useRegex, setUseRegex] = useState(false);
    const [matchCase, setMatchCase] = useState(false);
    const [matchWord, setMatchWord] = useState(false);
    const [searchOnlyOpenEditors, setSearchOnlyOpenEditors] = useState(false);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
    const { sessions } = useSessions();
    const { editor } = useEditor();

    useEffect(() => {
        if (results.length > 0) {
            const allFiles = new Set<string>();

            results.forEach((result) => {
                allFiles.add(result.file);
            });

            setExpandedFiles(allFiles);
        } else {
            setExpandedFiles(new Set());
        }
    }, [results]);

    const performSearch = useCallback(() => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        const searchResults: SearchResult[] = [];

        try {
            let pattern: RegExp;

            if (useRegex) {
                try {
                    pattern = new RegExp(searchQuery, matchCase ? "g" : "gi");
                } catch (e) {
                    setIsSearching(false);
                    return;
                }
            } else {
                const escaped = searchQuery.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&",
                );

                const wordBoundary = matchWord ? "\\b" : "";

                pattern = new RegExp(
                    `${wordBoundary}${escaped}${wordBoundary}`,
                    matchCase ? "g" : "gi",
                );
            }

            const matchesGlob = (filePath: string): boolean => {
                const globToRegex = (pattern: string): RegExp => {
                    let regexStr = pattern
                        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
                        .replace(/\*\*/g, "___GLOB_STAR_STAR___")
                        .replace(/\*/g, ".*")
                        .replace(/___GLOB_STAR_STAR___/g, ".*")
                        .replace(/\?/g, ".");

                    return new RegExp("^" + regexStr + "$", "i");
                };

                if (includeGlob.trim()) {
                    const includePatterns = includeGlob
                        .split(",")
                        .map((p) => p.trim())
                        .filter((p) => p);
                    const matchesInclude = includePatterns.some((pattern) => {
                        const regex = globToRegex(pattern);
                        return regex.test(filePath);
                    });
                    if (!matchesInclude) return false;
                }

                if (excludeGlob.trim()) {
                    const excludePatterns = excludeGlob
                        .split(",")
                        .map((p) => p.trim())
                        .filter((p) => p);
                    const matchesExclude = excludePatterns.some((pattern) => {
                        const regex = globToRegex(pattern);
                        return regex.test(filePath);
                    });
                    if (matchesExclude) return false;
                }

                return true;
            };

            if (searchOnlyOpenEditors && sessions.length > 0) {
                for (const session of sessions) {
                    if (!session.model) continue;

                    const filePath = session.file || session.name;
                    if (!matchesGlob(filePath)) continue;

                    const content = session.model.getValue();
                    const lines = content.split("\n");

                    lines.forEach((line, lineIndex) => {
                        const lineNumber = lineIndex + 1;
                        let match;
                        const regex = new RegExp(pattern.source, pattern.flags);

                        while ((match = regex.exec(line)) !== null) {
                            searchResults.push({
                                file: filePath,
                                line: lineNumber,
                                column: match.index + 1,
                                match: match[0],
                                lineContent: line,
                                isOpenEditor: true,
                            });

                            if (match[0].length === 0) {
                                regex.lastIndex++;
                            }
                        }
                    });
                }
            }

            if (!searchOnlyOpenEditors) {
                const allPaths = vfs.getAllPaths();

                for (const filePath of allPaths) {
                    if (!matchesGlob(filePath)) continue;

                    if (sessions.some((s) => (s.file || s.name) === filePath)) {
                        continue;
                    }

                    const content = vfs.get(filePath);
                    if (!content) continue;

                    const lines = content.split("\n");

                    lines.forEach((line, lineIndex) => {
                        const lineNumber = lineIndex + 1;
                        let match;
                        const regex = new RegExp(pattern.source, pattern.flags);

                        while ((match = regex.exec(line)) !== null) {
                            searchResults.push({
                                file: filePath,
                                line: lineNumber,
                                column: match.index + 1,
                                match: match[0],
                                lineContent: line,
                                isOpenEditor: false,
                            });

                            if (match[0].length === 0) {
                                regex.lastIndex++;
                            }
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Search error:", error);
        }

        setResults(searchResults);
        setIsSearching(false);
    }, [
        searchQuery,
        includeGlob,
        excludeGlob,
        useRegex,
        matchCase,
        matchWord,
        searchOnlyOpenEditors,
        sessions,
    ]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            performSearch();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [
        searchQuery,
        includeGlob,
        excludeGlob,
        useRegex,
        matchCase,
        matchWord,
        searchOnlyOpenEditors,
    ]);

    const groupedResults = useMemo(() => {
        const groups = new Map<string, SearchResult[]>();
        for (const result of results) {
            if (!groups.has(result.file)) {
                groups.set(result.file, []);
            }
            groups.get(result.file)!.push(result);
        }
        return groups;
    }, [results]);

    const handleResultClick = (result: SearchResult) => {
        if (!editor || !gmodInterface) return;

        if (result.isOpenEditor) {
            const session = sessions.find(
                (s) => (s.file || s.name) === result.file,
            );

            if (session && session.model) {
                editor.setModel(session.model);

                editor.setPosition({
                    lineNumber: result.line,
                    column: result.column,
                });

                editor.revealLineInCenter(result.line);
                editor.focus();
            }
        } else {
            const content = vfs.get(result.file);
            if (content) {
                gmodInterface.CreateSession({
                    name: result.file.split("/").pop() || "untitled",
                    code: content,
                    file: result.file,
                    language: "glua",
                    isFocused: true,
                });

                setTimeout(() => {
                    if (editor.getModel()) {
                        editor.setPosition({
                            lineNumber: result.line,
                            column: result.column,
                        });

                        editor.revealLineInCenter(result.line);
                        editor.focus();
                    }
                }, 100);
            }
        }
    };

    const toggleFileExpanded = (file: string) => {
        setExpandedFiles((prev) => {
            const next = new Set(prev);
            if (next.has(file)) {
                next.delete(file);
            } else {
                next.add(file);
            }
            return next;
        });
    };

    const highlightMatch = (line: string, match: string, column: number) => {
        const before = line.substring(0, column - 1);
        const matched = line.substring(column - 1, column - 1 + match.length);
        const after = line.substring(column - 1 + match.length);

        return (
            <>
                <span>{before}</span>
                <span className="search-match-highlight">{matched}</span>
                <span>{after}</span>
            </>
        );
    };

    return (
        <div id="monaco-search" className="monaco-editor">
            <div className="search-header">
                <div className="search-input-container">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                    <div className="search-input-actions">
                        <button
                            className={cn(
                                "search-action-button",
                                useRegex && "active",
                            )}
                            onClick={() => setUseRegex(!useRegex)}
                            title="Use Regular Expression"
                            type="button"
                        >
                            <span className="codicon codicon-regex" />
                        </button>
                        <button
                            className={cn(
                                "search-action-button",
                                matchCase && "active",
                            )}
                            onClick={() => setMatchCase(!matchCase)}
                            title="Match Case"
                            type="button"
                        >
                            <span className="codicon codicon-case-sensitive" />
                        </button>
                        <button
                            className={cn(
                                "search-action-button",
                                matchWord && "active",
                            )}
                            onClick={() => setMatchWord(!matchWord)}
                            title="Match Whole Word"
                            type="button"
                        >
                            <span className="codicon codicon-whole-word" />
                        </button>
                        {isSearching && (
                            <span className="codicon codicon-loading codicon-modifier-spin" />
                        )}
                    </div>
                </div>
            </div>

            <div className="search-options">
                <div className="search-option-row">
                    <div className="search-glob-container">
                        <input
                            type="text"
                            className="search-glob-input"
                            placeholder="files to include"
                            value={includeGlob}
                            onChange={(e) => setIncludeGlob(e.target.value)}
                        />
                        <div className="search-glob-actions">
                            <button
                                className={cn(
                                    "search-action-button",
                                    searchOnlyOpenEditors && "active",
                                )}
                                onClick={() =>
                                    setSearchOnlyOpenEditors(
                                        !searchOnlyOpenEditors,
                                    )
                                }
                                title="Search Only in Open Editors"
                                type="button"
                            >
                                <span className="codicon codicon-book" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="search-option-row">
                    <div className="search-glob-container">
                        <input
                            type="text"
                            className="search-glob-input"
                            placeholder="files to exclude"
                            value={excludeGlob}
                            onChange={(e) => setExcludeGlob(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="search-results">
                {results.length === 0 && searchQuery && !isSearching && (
                    <div className="search-empty">No results found</div>
                )}
                {results.length === 0 && !searchQuery && (
                    <div className="search-empty">Enter a search term</div>
                )}
                {Array.from(groupedResults.entries()).map(
                    ([file, fileResults]) => {
                        const isExpanded = expandedFiles.has(file);
                        return (
                            <div key={file} className="search-result-group">
                                <div
                                    className="search-result-file-header"
                                    onClick={() => toggleFileExpanded(file)}
                                >
                                    <span
                                        className={cn(
                                            "codicon",
                                            isExpanded
                                                ? "codicon-chevron-down"
                                                : "codicon-chevron-right",
                                        )}
                                    />
                                    <span className="search-result-file-name">
                                        {file}
                                    </span>
                                    <span className="search-result-count">
                                        {fileResults.length}
                                    </span>
                                </div>
                                {isExpanded && (
                                    <div className="search-result-items">
                                        {fileResults.map((result, index) => (
                                            <div
                                                key={`${result.line}-${index}`}
                                                className="search-result-item"
                                                onClick={() =>
                                                    handleResultClick(result)
                                                }
                                            >
                                                <div className="search-result-line-number">
                                                    {result.line}
                                                </div>
                                                <div className="search-result-line-content">
                                                    {highlightMatch(
                                                        result.lineContent,
                                                        result.match,
                                                        result.column,
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    },
                )}
            </div>
        </div>
    );
};

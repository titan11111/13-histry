// グローバル変数
let quizData = null;
let currentGenre = null;
let currentQuestionIndex = 0;
let score = 0;
let questions = [];
let clearedGenres = {}; // クリアしたジャンルを保存するオブジェクト
let bgmEnabled = false; // BGMの状態
let soundEnabled = true; // 効果音の状態

// 画面要素の取得
const screens = {
    title: document.getElementById('title-screen'),
    quiz: document.getElementById('quiz-screen'),
    result: document.getElementById('result-screen'),
    explanation: document.getElementById('explanation-screen'),
    loading: document.getElementById('loading-screen')
};

// 新しい要素の取得
const genreButtonsContainer = document.getElementById('genre-buttons');
const startAllClearedButton = document.getElementById('start-all-cleared-button');
const bgmAudio = document.getElementById('bgm'); // BGM要素を取得
const bgmStorageKey = 'bgmEnabled'; // LocalStorageのキー
const soundStorageKey = 'soundEnabled'; // 効果音設定のキー

// アプリ初期化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        loadSettings(); // 設定をロード
        loadClearedGenres(); // クリア状況をロード
        initializeBGM(); // BGMの初期化
        createControlButtons(); // 音声制御ボタンを作成
        await loadQuizData();
        setupEventListeners();
        showScreen('title');
    } catch (error) {
        console.error('初期化エラー:', error);
        showErrorMessage('アプリの初期化に失敗しました。ページを再読み込みしてください。');
    }
});

// 設定の保存と読み込み
function saveSettings() {
    localStorage.setItem(bgmStorageKey, bgmEnabled.toString());
    localStorage.setItem(soundStorageKey, soundEnabled.toString());
}

function loadSettings() {
    bgmEnabled = localStorage.getItem(bgmStorageKey) === 'true';
    soundEnabled = localStorage.getItem(soundStorageKey) !== 'false'; // デフォルトはtrue
}

// BGMの初期化と再生制御
function initializeBGM() {
    if (!bgmAudio) {
        console.warn('BGMオーディオ要素が見つかりません');
        return;
    }

    bgmAudio.volume = 0.3; // 音量を30%に設定
    bgmAudio.loop = true;

    if (bgmEnabled) {
        // ユーザーの操作後に再生を試みる
        document.addEventListener('click', playBGMOnFirstInteraction, { once: true });
        document.addEventListener('touchstart', playBGMOnFirstInteraction, { once: true });
    }
}

// 最初のユーザー操作でBGMを再生
function playBGMOnFirstInteraction() {
    if (bgmEnabled && bgmAudio) {
        bgmAudio.play().catch(error => {
            console.warn('BGMの再生に失敗:', error);
        });
    }
}

// 音声制御ボタンの作成
function createControlButtons() {
    const controlContainer = document.createElement('div');
    controlContainer.style.cssText = `
        position: fixed;
        bottom: 10px;
        right: 10px;
        z-index: 1000;
        display: flex;
        gap: 10px;
    `;

    // BGMボタン
    const bgmButton = document.createElement('button');
    bgmButton.textContent = bgmEnabled ? '🎵' : '🔇';
    bgmButton.style.cssText = `
        padding: 8px;
        border: 2px solid #6d330c;
        background: rgba(139, 69, 19, 0.9);
        color: white;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
    `;
    bgmButton.title = 'BGMのオン/オフ';

    bgmButton.addEventListener('click', () => {
        bgmEnabled = !bgmEnabled;
        bgmButton.textContent = bgmEnabled ? '🎵' : '🔇';
        
        if (bgmEnabled && bgmAudio) {
            bgmAudio.play().catch(error => {
                console.warn('BGM再生エラー:', error);
            });
        } else if (bgmAudio) {
            bgmAudio.pause();
        }
        
        saveSettings();
    });

    // 効果音ボタン
    const soundButton = document.createElement('button');
    soundButton.textContent = soundEnabled ? '🔊' : '🔈';
    soundButton.style.cssText = bgmButton.style.cssText;
    soundButton.title = '効果音のオン/オフ';

    soundButton.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundButton.textContent = soundEnabled ? '🔊' : '🔈';
        saveSettings();
    });

    controlContainer.appendChild(bgmButton);
    controlContainer.appendChild(soundButton);
    document.body.appendChild(controlContainer);
}

// 効果音再生関数
function playSound(type) {
    if (!soundEnabled) return;
    
    // Web Audio APIを使用した簡単な効果音生成
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        switch(type) {
            case 'correct':
                oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
                oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
                oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
                break;
            case 'incorrect':
                oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
                oscillator.frequency.setValueAtTime(196, audioContext.currentTime + 0.1); // G3
                break;
            case 'click':
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                break;
        }
        
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        console.warn('効果音の再生に失敗:', error);
    }
}

// エラーメッセージ表示
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(217, 83, 79, 0.95);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10000;
        text-align: center;
        max-width: 80%;
    `;
    errorDiv.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '閉じる';
    closeButton.style.cssText = `
        margin-top: 15px;
        padding: 10px 20px;
        background: white;
        color: #d9534f;
        border: none;
        border-radius: 5px;
        cursor: pointer;
    `;
    closeButton.onclick = () => document.body.removeChild(errorDiv);
    
    errorDiv.appendChild(closeButton);
    document.body.appendChild(errorDiv);
}

// クイズデータの読み込み
async function loadQuizData() {
    try {
        showScreen('loading');
        
        // サンプルデータ（JSONファイルがない場合の代替）
        const sampleData = {
            genres: [
                {
                    id: 'meiji',
                    name: '明治維新',
                    description: '日本の近代化の始まり',
                    questions: [
                        {
                            id: 1,
                            question: '明治維新が起こった年は？',
                            choices: ['1867年', '1868年', '1869年', '1870年'],
                            correct: 1,
                            explanation: '明治維新は1868年に起こりました。王政復古の大号令が発せられ、江戸幕府が終わりを告げました。'
                        },
                        {
                            id: 2,
                            question: '廃藩置県が行われた年は？',
                            choices: ['1869年', '1870年', '1871年', '1872年'],
                            correct: 2,
                            explanation: '廃藩置県は1871年（明治4年）に行われ、藩を廃止して県を置く中央集権体制が確立されました。'
                        }
                    ]
                },
                {
                    id: 'taisho',
                    name: '大正時代',
                    description: '大正デモクラシーの時代',
                    questions: [
                        {
                            id: 1,
                            question: '大正時代の始まりは？',
                            choices: ['1910年', '1911年', '1912年', '1913年'],
                            correct: 2,
                            explanation: '大正時代は1912年（大正元年）から1926年まで続きました。明治天皇が崩御し、大正天皇が即位しました。'
                        },
                        {
                            id: 2,
                            question: '第一次世界大戦中の日本の動きは？',
                            choices: ['中立を保った', '連合国側で参戦', '同盟国側で参戦', '戦争に関与しなかった'],
                            correct: 1,
                            explanation: '日本は日英同盟に基づき連合国側で第一次世界大戦に参戦し、大戦景気で経済が発展しました。'
                        }
                    ]
                }
            ]
        };

        // まずJSONファイルの読み込みを試行
        try {
            const response = await fetch('./modern_history_quizData_complete.json');
            if (response.ok) {
                quizData = await response.json();
            } else {
                throw new Error('JSONファイルが見つかりません');
            }
        } catch (fetchError) {
            console.warn('JSONファイルの読み込みに失敗、サンプルデータを使用:', fetchError);
            quizData = sampleData;
        }

        renderGenreButtons();
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        showErrorMessage('クイズデータの読み込みに失敗しました。');
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // ホームボタン
    document.getElementById('home-btn')?.addEventListener('click', () => {
        playSound('click');
        resetQuiz();
        showScreen('title');
    });

    // 再挑戦ボタン
    document.getElementById('retry-btn')?.addEventListener('click', () => {
        playSound('click');
        currentQuestionIndex = 0;
        score = 0;
        showScreen('quiz');
        displayQuestion();
    });

    // 次の問題へボタン
    document.getElementById('next-btn')?.addEventListener('click', () => {
        playSound('click');
        advanceQuestion();
    });

    // 戻るボタン
    document.getElementById('back-btn')?.addEventListener('click', () => {
        if (confirm('クイズを中断してタイトルに戻りますか？')) {
            playSound('click');
            resetQuiz();
            showScreen('title');
        }
    });

    // 全クリアボタン
    startAllClearedButton?.addEventListener('click', () => {
        playSound('correct');
        showCongratulationsMessage();
    });

    // キーボードショートカット
    document.addEventListener('keydown', handleKeydown);
}

// キーボード操作
function handleKeydown(event) {
    if (screens.quiz.classList.contains('active')) {
        // クイズ画面でのキーボード操作
        const choiceButtons = document.querySelectorAll('.choice-btn:not(.disabled)');
        if (event.key >= '1' && event.key <= '4') {
            const index = parseInt(event.key) - 1;
            if (choiceButtons[index]) {
                choiceButtons[index].click();
            }
        }
    } else if (screens.explanation.classList.contains('active')) {
        // 解説画面でのキーボード操作
        if (event.key === 'Enter' || event.key === ' ') {
            document.getElementById('next-btn')?.click();
        }
    }
}

// おめでとうメッセージの表示
function showCongratulationsMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;

    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = `
        background: var(--card-bg);
        border: 3px solid var(--accent-color);
        border-radius: 15px;
        padding: 40px;
        text-align: center;
        max-width: 80%;
        box-shadow: 0 0 30px rgba(218, 165, 32, 0.5);
    `;

    contentDiv.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: 20px;">🏆</div>
        <h2 style="color: var(--accent-color); font-size: 2.5rem; margin-bottom: 20px;">おめでとうございます！</h2>
        <p style="font-size: 1.3rem; margin-bottom: 30px; color: var(--text-light);">
            全ての歴史ルートをクリアしました！<br>
            あなたは真の歴史マスターです！
        </p>
        <button id="close-congratulations" style="
            background: var(--accent-color);
            border: 2px solid var(--button-border);
            color: var(--text-primary);
            padding: 15px 30px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 1.2rem;
            font-weight: bold;
        ">閉じる</button>
    `;

    messageDiv.appendChild(contentDiv);
    document.body.appendChild(messageDiv);

    // アニメーション効果
    contentDiv.style.transform = 'scale(0.8)';
    contentDiv.style.opacity = '0';
    
    setTimeout(() => {
        contentDiv.style.transition = 'all 0.3s ease';
        contentDiv.style.transform = 'scale(1)';
        contentDiv.style.opacity = '1';
    }, 100);

    // 閉じるボタンのイベント
    document.getElementById('close-congratulations').onclick = () => {
        document.body.removeChild(messageDiv);
    };
}

// 画面表示切り替え
function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (screens[screenName]) {
        screens[screenName].classList.add('active');
    }

    // タイトル画面に戻る際にジャンルボタンを再レンダリング
    if (screenName === 'title') {
        renderGenreButtons();
    }
}

// ジャンルボタンのレンダリング
function renderGenreButtons() {
    if (!genreButtonsContainer || !quizData) return;
    
    genreButtonsContainer.innerHTML = '';
    let allGenresCleared = true;

    quizData.genres.forEach(genre => {
        const button = document.createElement('button');
        button.classList.add('genre-button');
        button.dataset.genreId = genre.id;
        
        const questionCount = genre.questions ? genre.questions.length : 0;
        button.innerHTML = `
            <h3>${genre.name}</h3>
            <p>${genre.description}</p>
            <small>問題数: ${questionCount}問</small>
        `;

        if (clearedGenres[genre.id]) {
            button.classList.add('cleared');
        } else {
            allGenresCleared = false;
        }

        button.addEventListener('click', () => {
            playSound('click');
            startQuiz(genre.id);
        });
        genreButtonsContainer.appendChild(button);
    });

    // 全クリアボタンの表示制御
    if (startAllClearedButton) {
        if (allGenresCleared && quizData.genres.length > 0) {
            startAllClearedButton.classList.add('show');
        } else {
            startAllClearedButton.classList.remove('show');
        }
    }
}

// クイズ開始
function startQuiz(genreId) {
    const selectedGenre = quizData.genres.find(genre => genre.id === genreId);
    if (!selectedGenre || !selectedGenre.questions || selectedGenre.questions.length === 0) {
        showErrorMessage('選択されたジャンルの問題が見つかりません。');
        return;
    }

    currentGenre = genreId;
    currentQuestionIndex = 0;
    score = 0;
    questions = [...selectedGenre.questions]; // 配列をコピー（シャッフル用）
    
    // 問題をシャッフル（オプション）
    // questions = shuffleArray(questions);
    
    const genreTitle = document.getElementById('genre-title');
    const totalQuestions = document.getElementById('total-questions');
    
    if (genreTitle) genreTitle.textContent = selectedGenre.name;
    if (totalQuestions) totalQuestions.textContent = questions.length;
    
    showScreen('quiz');
    displayQuestion();
}

// 配列シャッフル関数
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// 問題表示
function displayQuestion() {
    const questionText = document.getElementById('question-text');
    const choicesContainer = document.getElementById('choices');
    const questionNumberSpan = document.getElementById('question-number');

    if (currentQuestionIndex >= questions.length) {
        showResult();
        return;
    }

    const question = questions[currentQuestionIndex];
    
    if (questionText) questionText.textContent = question.question;
    if (questionNumberSpan) questionNumberSpan.textContent = currentQuestionIndex + 1;
    
    if (choicesContainer) {
        choicesContainer.innerHTML = '';
        
        question.choices.forEach((choice, index) => {
            const button = document.createElement('button');
            button.classList.add('choice-btn');
            button.textContent = choice;
            button.dataset.index = index;
            button.addEventListener('click', () => {
                checkAnswer(index, question.correct, question.explanation);
            });
            choicesContainer.appendChild(button);
        });
    }
}

// 回答チェック
function checkAnswer(selectedIndex, correctAnswerIndex, explanationText) {
    const choices = document.querySelectorAll('.choice-btn');
    const isCorrect = (selectedIndex === correctAnswerIndex);

    choices.forEach((button, index) => {
        button.disabled = true;
        button.classList.add('disabled');
        if (index === correctAnswerIndex) {
            button.classList.add('correct');
        } else if (index === selectedIndex && !isCorrect) {
            button.classList.add('incorrect');
        }
    });

    // 効果音再生
    playSound(isCorrect ? 'correct' : 'incorrect');

    if (isCorrect) {
        score++;
        document.getElementById('result-icon').textContent = '⭕';
        document.getElementById('result-title').textContent = '正解！';
    } else {
        document.getElementById('result-icon').textContent = '❌';
        document.getElementById('result-title').textContent = '不正解...';
    }
    
    const explanationElement = document.getElementById('explanation-text');
    if (explanationElement) {
        explanationElement.textContent = explanationText;
    }
    
    // 少し遅延を入れてから解説画面を表示
    setTimeout(() => {
        showScreen('explanation');
    }, 1000);
}

// 次の問題へ
function advanceQuestion() {
    currentQuestionIndex++;
    
    if (currentQuestionIndex >= questions.length) {
        showResult();
    } else {
        showScreen('quiz');
        displayQuestion();
    }
}

// 結果画面表示
function showResult() {
    const scoreText = document.getElementById('score-text');
    const scoreMessage = document.getElementById('score-message');
    const totalQuestions = questions.length;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    if (scoreText) scoreText.textContent = `${score}/${totalQuestions}`;
    
    let message = '';
    let isCleared = false;
    
    if (percentage >= 90) {
        message = '🏆 素晴らしい！歴史博士ですね！';
        isCleared = true;
    } else if (percentage >= 70) {
        message = '😊 よくできました！';
        isCleared = true;
    } else if (percentage >= 50) {
        message = '👍 まずまずですね！';
    } else {
        message = '📚 もう少し勉強が必要かも...';
    }
    
    if (scoreMessage) scoreMessage.textContent = message;

    // ジャンルクリア判定と保存
    if (currentGenre && isCleared) {
        if (!clearedGenres[currentGenre]) {
            clearedGenres[currentGenre] = true;
            saveClearedGenres();
            playSound('correct');
        }
    }

    showScreen('result');
}

// クイズリセット
function resetQuiz() {
    currentGenre = null;
    currentQuestionIndex = 0;
    score = 0;
    questions = [];
}

// クリア状況の保存と読み込み
function saveClearedGenres() {
    try {
        localStorage.setItem('clearedGenres', JSON.stringify(clearedGenres));
    } catch (error) {
        console.warn('クリア状況の保存に失敗:', error);
    }
}

function loadClearedGenres() {
    try {
        const storedClearedGenres = localStorage.getItem('clearedGenres');
        if (storedClearedGenres) {
            clearedGenres = JSON.parse(storedClearedGenres);
        } else {
            clearedGenres = {};
        }
    } catch (error) {
        console.warn('クリア状況の読み込みに失敗:', error);
        clearedGenres = {};
    }
}

// データリセット機能（デバッグ用）
function resetAllData() {
    if (confirm('全ての進行状況をリセットしますか？この操作は取り消せません。')) {
        clearedGenres = {};
        saveClearedGenres();
        renderGenreButtons();
        alert('全ての進行状況がリセットされました。');
    }
}

// エラーハンドリング
window.addEventListener('error', (e) => {
    console.error('JavaScript エラー:', e.error);
    showErrorMessage('予期しないエラーが発生しました。ページを再読み込みしてください。');
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未処理のPromise拒否:', e.reason);
    e.preventDefault();
});

// ページの可視性変更時の処理
document.addEventListener('visibilitychange', () => {
    if (document.hidden && bgmAudio) {
        bgmAudio.pause();
    } else if (!document.hidden && bgmEnabled && bgmAudio) {
        bgmAudio.play().catch(error => {
            console.warn('BGM再生エラー:', error);
        });
    }
});

// サービスワーカー登録（オフライン対応）
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('ServiceWorker registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('ServiceWorker registration failed: ', registrationError);
            });
    });
}

// デバッグ用関数（開発時のみ使用）
if (typeof window !== 'undefined') {
    window.debugQuiz = {
        resetAllData,
        showAllGenres: () => console.log(quizData),
        showClearedGenres: () => console.log(clearedGenres),
        forceCompleteGenre: (genreId) => {
            clearedGenres[genreId] = true;
            saveClearedGenres();
            renderGenreButtons();
        }
    };
}
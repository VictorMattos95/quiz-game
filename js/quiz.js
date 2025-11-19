document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos da UI ---
    const errorBox = document.getElementById('error-box');
    const errorMessage = document.getElementById('error-message');
    const quizContent = document.getElementById('quiz-content');
    const scoreBox = document.getElementById('score-box');
    
    const questionTitleEl = document.getElementById('question-title');
    const progressEl = document.getElementById('progress');
    const answersEl = document.getElementById('answers');
    const nextBtn = document.getElementById('next-btn');
    const explanationBox = document.getElementById('explanation-box'); 
    const menuToggle = document.getElementById('menu-toggle');
    // (NOVO) Botão de Tema
    const themeToggle = document.getElementById('theme-toggle'); 
    const navMenu = document.getElementById('nav-menu');
    const navOverlay = document.getElementById('nav-overlay');
    const questionList = document.getElementById('question-list');
    const scoreTextEl = document.getElementById('score-text');
    const scoreContainer = document.getElementById('score-box');

    // --- Estado do Quiz ---
    let currentQuestionIndex = 0;
    let score = 0;
    let quizData = []; 
    let assunto = ''; 
    let quizStateKey = ''; 
    let reviewMode = false;

    // --- (A) Algoritmo Fisher-Yates (Shuffle Real) ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // --- (4) Lógica do Dark Mode ---
    function initTheme() {
        const savedTheme = localStorage.getItem('quizTheme');
        // Se não houver salvo, verifica preferência do sistema
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
            if(themeToggle) themeToggle.innerText = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            if(themeToggle) themeToggle.innerText = '🌙';
        }
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('quizTheme', isDark ? 'dark' : 'light');
            themeToggle.innerText = isDark ? '☀️' : '🌙';
        });
    }

    // --- (B) Acessibilidade e Atalhos de Teclado ---
    document.addEventListener('keydown', (e) => {
        // Se o quiz não estiver visível, ignora
        if (quizContent.style.display === 'none') return;

        const key = e.key.toLowerCase();
        
        // Mapeamento: Teclas 1-5 ou A-E para selecionar opções
        const mapKeys = {
            '1': 0, 'a': 0,
            '2': 1, 'b': 1,
            '3': 2, 'c': 2,
            '4': 3, 'd': 3,
            '5': 4, 'e': 4
        };

        if (mapKeys.hasOwnProperty(key)) {
            const buttons = answersEl.querySelectorAll('.answer-btn');
            const index = mapKeys[key];
            // Clica no botão se ele existir e não estiver desativado
            if (buttons[index] && !buttons[index].disabled) {
                buttons[index].click();
            }
        }

        // Tecla Enter: Funciona para "Verificar", "Próxima" ou Submeter input de texto
        if (key === 'enter') {
            // Cenário 1: Campo de texto (Fill in the blank)
            const fillInput = document.getElementById('fill-answer-input');
            const fillSubmit = document.getElementById('fill-submit-btn');
            if (fillInput && fillSubmit && !fillSubmit.disabled) {
                fillSubmit.click();
                return;
            }

            // Cenário 2: Múltipla escolha (Botão Verificar)
            const multiBtn = document.getElementById('multi-submit-btn');
            if (multiBtn && !multiBtn.disabled) {
                multiBtn.click();
                return;
            }

            // Cenário 3: Botão Próxima (se estiver visível)
            if (nextBtn.style.display !== 'none') {
                handleNextButton();
            }
        }
    });

    // --- Funções de Erro e Navegação ---

    function showUIError(message) {
        quizContent.style.display = 'none';
        scoreBox.style.display = 'none';
        errorMessage.textContent = message;
        errorBox.style.display = 'block';
        menuToggle.style.display = 'none'; 
        if(themeToggle) themeToggle.style.display = 'none';
    }

    function openNavMenu() {
        navMenu.classList.add('open');
        navOverlay.classList.add('open');
    }

    function closeNavMenu() {
        navMenu.classList.remove('open');
        navOverlay.classList.remove('open');
    }

    // --- Funções de Persistência (LocalStorage) ---

    function saveQuizState() {
        if (reviewMode) return; 

        const state = {
            currentQuestionIndex: currentQuestionIndex,
            score: score,
            questions: quizData.map(q => ({
                id: q.id,
                answered: q.answered,
                isCorrect: q.isCorrect,
                userAnswer: q.userAnswer, 
                optionOrder: q.optionOrder 
            }))
        };
        localStorage.setItem(quizStateKey, JSON.stringify(state));
    }

    function loadQuizState() {
        const savedState = localStorage.getItem(quizStateKey);
        if (!savedState) return null;

        try {
            return JSON.parse(savedState);
        } catch (e) {
            console.error("Erro ao carregar estado:", e);
            localStorage.removeItem(quizStateKey);
            return null;
        }
    }

    function clearQuizState() {
        localStorage.removeItem(quizStateKey);
    }

    // --- Funções Principais do Quiz ---

    function startQuiz(resumeState = null) {
        reviewMode = false;
        
        if (resumeState) {
            // Restaura o estado salvo
            currentQuestionIndex = resumeState.currentQuestionIndex;
            score = resumeState.score;
            
            const stateMap = new Map();
            resumeState.questions.forEach(q => {
                stateMap.set(q.id, { 
                    answered: q.answered, 
                    isCorrect: q.isCorrect, 
                    userAnswer: q.userAnswer,
                    optionOrder: q.optionOrder
                });
            });

            // Reordena o quizData para corresponder à ordem salva
            quizData.sort((a, b) => {
                const indexA = resumeState.questions.findIndex(item => item.id === a.id);
                const indexB = resumeState.questions.findIndex(item => item.id === b.id);
                return indexA - indexB;
            });

            quizData.forEach(q => {
                const savedQ = stateMap.get(q.id);
                if (savedQ) {
                    q.answered = savedQ.answered;
                    q.isCorrect = savedQ.isCorrect;
                    q.userAnswer = savedQ.userAnswer;
                    q.optionOrder = savedQ.optionOrder;
                } else {
                    q.answered = false;
                    q.isCorrect = undefined;
                }
            });

        } else {
            // (A) Usa o novo algoritmo de Shuffle
            shuffleArray(quizData);
            currentQuestionIndex = 0;
            score = 0;
            quizData.forEach(q => {
                q.answered = false;
                q.isCorrect = undefined;
                delete q.userAnswer;
                delete q.optionOrder; 
            });
            clearQuizState(); 
        }
        
        scoreContainer.style.display = 'none';
        quizContent.style.display = 'block';
        nextBtn.innerHTML = "Próxima (Enter)";
        
        populateNavMenu(); 
        showQuestion();
        menuToggle.style.display = 'block'; 
        if(themeToggle) themeToggle.style.display = 'block';
    }

    function startReviewMode() {
        reviewMode = true;
        currentQuestionIndex = 0;
        
        scoreContainer.style.display = 'none';
        quizContent.style.display = 'block';
        menuToggle.style.display = 'block';
        if(themeToggle) themeToggle.style.display = 'block';
        nextBtn.innerHTML = "Próxima Revisão";
        
        populateNavMenu(); 
        showQuestion(); 
    }


    function showQuestion() {
        resetState();
        const currentQuestion = quizData[currentQuestionIndex];
        const questionNumber = currentQuestionIndex + 1;
        
        // (C) Segurança: Mantemos innerHTML pois o conteúdo vem de JSONs controlados por você
        // e contêm tags como <code> necessárias para TI.
        questionTitleEl.innerHTML = `${questionNumber}. ${currentQuestion.pergunta}`;
        progressEl.innerText = `Pergunta ${questionNumber}/${quizData.length}`;

        if (currentQuestion.imagem) {
            const imgEl = document.createElement('img');
            imgEl.src = `images/${currentQuestion.imagem}`; 
            imgEl.alt = "Contexto visual para a pergunta";
            imgEl.style.width = "100%"; 
            imgEl.style.maxWidth = "600px"; 
            imgEl.style.margin = "15px auto";
            imgEl.style.display = "block";
            imgEl.style.borderRadius = "8px";
            imgEl.style.border = "1px solid #eee";
            answersEl.before(imgEl); 
        }

        const correctAnswers = currentQuestion.respostaCorreta;
        const isMultiAnswer = Array.isArray(correctAnswers);

        if (currentQuestion.tipo === 'fill') {
            const input = document.createElement("input");
            input.type = "text";
            input.id = "fill-answer-input";
            input.placeholder = "Digite sua resposta aqui...";
            input.classList.add("answer-input"); 
            // Foca no input automaticamente (UX)
            setTimeout(() => input.focus(), 100);

            const submitBtn = document.createElement("button");
            submitBtn.innerText = "Verificar";
            submitBtn.classList.add("action-btn", "submit-fill-btn"); 
            submitBtn.id = "fill-submit-btn";
            submitBtn.addEventListener("click", checkFillAnswer);

            answersEl.appendChild(input);
            answersEl.appendChild(submitBtn);

        } else {
            const displayKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G']; 
            
            let originalKeys = Object.keys(currentQuestion.opcoes);

            // (A) Embaralha as opções se ainda não tiver ordem salva
            if (!currentQuestion.optionOrder) {
                shuffleArray(originalKeys);
                currentQuestion.optionOrder = originalKeys;
            } else {
                originalKeys = currentQuestion.optionOrder; 
            }

            if (isMultiAnswer) {
                originalKeys.forEach((originalKey, index) => {
                    const displayKey = displayKeys[index]; 
                    const answerText = currentQuestion.opcoes[originalKey]; 

                    const button = document.createElement("button");
                    button.innerHTML = `<span class="option-key">${displayKey}:</span> <span class="option-text">${answerText}</span>`;
                    button.classList.add("answer-btn");
                    button.dataset.key = originalKey; 
                    button.addEventListener("click", toggleAnswer); 
                    answersEl.appendChild(button);
                });
                
                const submitBtn = document.createElement("button");
                submitBtn.innerText = "Verificar Respostas";
                submitBtn.classList.add("action-btn", "submit-fill-btn"); 
                submitBtn.id = "multi-submit-btn";
                submitBtn.addEventListener("click", checkMultiAnswer);
                answersEl.appendChild(submitBtn);

            } else {
                originalKeys.forEach((originalKey, index) => {
                    const displayKey = displayKeys[index]; 
                    const answerText = currentQuestion.opcoes[originalKey]; 
                    
                    const button = document.createElement("button");
                    button.innerHTML = `<span class="option-key">${displayKey}:</span> <span class="option-text">${answerText}</span>`;
                    button.classList.add("answer-btn");
                    button.dataset.key = originalKey; 

                    if (originalKey === correctAnswers) { 
                        button.dataset.correct = "true";
                    }
                    button.addEventListener("click", selectAnswer); 
                    answersEl.appendChild(button);
                });
            }
        }

        if (currentQuestion.answered) {
            showAnswerState();
        }
    }

    function showAnswerState() {
        const currentQuestion = quizData[currentQuestionIndex];
        const correctAnswers = currentQuestion.respostaCorreta;
        const isMultiAnswer = Array.isArray(correctAnswers);
        
        if (currentQuestion.tipo === 'fill') {
            const inputEl = document.getElementById('fill-answer-input');
            const submitBtn = document.getElementById('fill-submit-btn');
            if (inputEl) {
                inputEl.value = currentQuestion.userAnswer || "";
                inputEl.disabled = true;
                if (currentQuestion.isCorrect) {
                    inputEl.classList.add("correct");
                } else {
                    inputEl.classList.add("incorrect");
                }
            }
            if (submitBtn) submitBtn.disabled = true;

        } else {
            const buttons = Array.from(answersEl.querySelectorAll('.answer-btn'));
            const userAnswer = currentQuestion.userAnswer; 

            buttons.forEach(button => {
                const key = button.dataset.key;
                if (!key) return; 

                button.disabled = true;

                if (isMultiAnswer) {
                    const isSelected = userAnswer && userAnswer.includes(key);
                    const isCorrectAnswer = correctAnswers.includes(key);

                    if (isSelected) {
                        button.classList.add(isCorrectAnswer ? 'correct' : 'incorrect');
                        button.classList.add('selected');
                    } else if (isCorrectAnswer) {
                        button.classList.add('missed');
                    }
                } else {
                    const isSelected = (userAnswer === key);
                    const isCorrect = (button.dataset.correct === "true");

                    if (isCorrect) {
                        button.classList.add("correct");
                    } else if (isSelected && !isCorrect) {
                        button.classList.add("incorrect");
                    }
                }
            });
            
            const submitBtn = document.getElementById('multi-submit-btn');
            if(submitBtn) submitBtn.disabled = true;
        }

        showExplanation(); 
        nextBtn.style.display = 'block';
        // (B) Acessibilidade: Foca no botão "Próxima" para agilizar navegação
        nextBtn.focus();
    }


    function resetState() {
        nextBtn.style.display = 'none';
        explanationBox.style.display = 'none';
        explanationBox.innerHTML = '';
        
        while (answersEl.firstChild) {
            answersEl.removeChild(answersEl.firstChild);
        }

        const oldImg = quizContent.querySelector('img');
        if (oldImg) {
            oldImg.remove();
        }
    }

    function selectAnswer(e) {
        if (reviewMode || quizData[currentQuestionIndex].answered) return;

        const selectedBtn = e.target.closest('.answer-btn'); 
        const isCorrect = selectedBtn.dataset.correct === "true";
        const currentQuestion = quizData[currentQuestionIndex];

        currentQuestion.answered = true;
        currentQuestion.userAnswer = selectedBtn.dataset.key; 

        if (isCorrect) {
            selectedBtn.classList.add("correct");
            currentQuestion.isCorrect = true;
            score++;
        } else {
            selectedBtn.classList.add("incorrect");
            currentQuestion.isCorrect = false;
        }

        Array.from(answersEl.children).forEach(button => {
            if (button.classList.contains('answer-btn') && !button.id.includes('submit')) { 
                if (button.dataset.correct === "true") {
                    button.classList.add("correct");
                }
                button.disabled = true;
            }
        });
        
        finishAnswerTurn();
    }

    function checkFillAnswer() {
        if (reviewMode || quizData[currentQuestionIndex].answered) return;
        
        const inputEl = document.getElementById('fill-answer-input');
        const submitBtn = document.getElementById('fill-submit-btn');
        const userAnswer = inputEl.value.trim(); 
        const currentQuestion = quizData[currentQuestionIndex];
        const correctAnswers = currentQuestion.respostaCorreta;

        currentQuestion.answered = true;
        currentQuestion.userAnswer = userAnswer;

        // (3) Case Sensitive mantido conforme solicitação (sem normalização)
        let isCorrect = false;
        if (Array.isArray(correctAnswers)) {
            isCorrect = correctAnswers.some(ans => ans === userAnswer);
        } else {
            isCorrect = (correctAnswers === userAnswer);
        }

        if (isCorrect) {
            inputEl.classList.add("correct");
            currentQuestion.isCorrect = true;
            score++;
        } else {
            inputEl.classList.add("incorrect");
            currentQuestion.isCorrect = false;
        }
        
        inputEl.disabled = true;
        submitBtn.disabled = true;
        finishAnswerTurn();
    }

    function toggleAnswer(e) {
        if (reviewMode || quizData[currentQuestionIndex].answered) return;
        e.target.closest('.answer-btn').classList.toggle('selected');
    }

    function checkMultiAnswer() {
        if (reviewMode || quizData[currentQuestionIndex].answered) return;

        const currentQuestion = quizData[currentQuestionIndex];
        const correctAnswers = currentQuestion.respostaCorreta;
        const buttons = Array.from(answersEl.querySelectorAll('.answer-btn'));
        const selectedAnswers = []; 

        buttons.forEach(button => {
            const key = button.dataset.key;
            if (key && button.classList.contains('selected')) {
                selectedAnswers.push(key);
            }
        });

        currentQuestion.answered = true;
        currentQuestion.userAnswer = selectedAnswers; 

        const sortedCorrect = [...correctAnswers].sort();
        const sortedSelected = [...selectedAnswers].sort();
        const isPerfectMatch = JSON.stringify(sortedCorrect) === JSON.stringify(sortedSelected);
        
        if (isPerfectMatch) {
            currentQuestion.isCorrect = true;
            score++;
        } else {
            currentQuestion.isCorrect = false;
        }

        buttons.forEach(button => {
            const key = button.dataset.key;
            if (!key) return; 

            const isCorrectAnswer = correctAnswers.includes(key);
            const isSelected = button.classList.contains('selected');

            if (isSelected) {
                button.classList.add(isCorrectAnswer ? 'correct' : 'incorrect');
            } else if (isCorrectAnswer) {
                button.classList.add('missed');
            }
            button.disabled = true;
        });

        document.getElementById('multi-submit-btn').disabled = true;
        finishAnswerTurn();
    }

    // Função auxiliar para centralizar o que acontece ao finalizar uma pergunta
    function finishAnswerTurn() {
        showExplanation();
        nextBtn.style.display = 'block';
        nextBtn.focus(); // Acessibilidade
        updateNavItemStatus(currentQuestionIndex, quizData[currentQuestionIndex].isCorrect);
        saveQuizState();
    }
    
    function showExplanation() {
        const currentQuestion = quizData[currentQuestionIndex];
        const explanation = currentQuestion.explicacao;
        let html = "";

        // Mostra a resposta correta se for 'fill' e estiver errada
        if (currentQuestion.tipo === 'fill' && currentQuestion.answered && !currentQuestion.isCorrect) {
            const correctAnswers = currentQuestion.respostaCorreta;
            const displayAnswers = Array.isArray(correctAnswers) ? correctAnswers.join('</strong> ou <strong>') : correctAnswers;
            html += `<p style="margin-bottom: 15px; color: #dc3545; font-weight: 500;">Resposta correta: <strong>${displayAnswers}</strong></p>`;
        }

        if (explanation) {
            html += `<strong>Explicação:</strong> ${explanation}`;
        }

        if (html) {
            explanationBox.innerHTML = html;
            explanationBox.style.display = 'block';
        }
    }

    function populateNavMenu() {
        questionList.innerHTML = ''; 
        quizData.forEach((question, index) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            
            let statusIcon = '';
            if (question.answered) {
                statusIcon = question.isCorrect ? ' ✔' : ' ✘';
                a.style.color = question.isCorrect ? '#155724' : '#721c24';
            }

            const cleanText = question.pergunta.replace(/<[^>]+>/g, ''); 
            a.textContent = `Questão ${index + 1}: ${cleanText.substring(0, 30)}...${statusIcon}`;
            
            a.dataset.index = index;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                jumpToQuestion(index);
            });
            li.appendChild(a);
            questionList.appendChild(li);
        });
    }

    function updateNavItemStatus(index, isCorrect) {
        const navItem = questionList.querySelector(`a[data-index="${index}"]`);
        if (navItem) {
            const statusIcon = isCorrect ? ' ✔' : ' ✘';
            navItem.style.color = isCorrect ? '#155724' : '#721c24';
            navItem.textContent = navItem.textContent.replace(/ [✔✘]$/, '');
            navItem.textContent += statusIcon;
        }
    }

    function jumpToQuestion(index) {
        currentQuestionIndex = index;
        showQuestion();
        closeNavMenu();
    }

    function showScore() {
        resetState();
        quizContent.style.display = 'none';
        
        let correctPercentage = (score / quizData.length) * 100;
        let title = "Quiz Finalizado!";
        if (correctPercentage >= 70) {
            title = "Excelente! Quiz Finalizado!";
        } else if (correctPercentage >= 50) {
            title = "Bom trabalho! Quiz Finalizado!";
        } else {
            title = "Quiz Finalizado. Continue estudando!";
        }
        
        document.getElementById('score-title').innerText = title;
        scoreTextEl.innerText = `Você acertou ${score} de ${quizData.length} perguntas (${correctPercentage.toFixed(0)}%).`;
        scoreBox.style.display = 'block';
        menuToggle.style.display = 'none'; 
        if(themeToggle) themeToggle.style.display = 'none';
        clearQuizState(); 

        const oldButtons = scoreContainer.querySelectorAll('.action-btn');
        oldButtons.forEach(btn => btn.remove());

        const restartBtn = document.createElement("a");
        restartBtn.href = "#";
        restartBtn.id = "restart-btn";
        restartBtn.classList.add("action-btn");
        restartBtn.innerText = "Jogar Novamente";
        restartBtn.style.marginRight = "10px";
        restartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startQuiz(); 
        });

        const reviewBtn = document.createElement("a");
        reviewBtn.href = "#";
        reviewBtn.id = "review-btn";
        reviewBtn.classList.add("action-btn");
        reviewBtn.innerText = "Revisar Prova";
        reviewBtn.style.background = "#6c757d"; 
        reviewBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startReviewMode();
        });

        scoreContainer.appendChild(restartBtn);
        scoreContainer.appendChild(reviewBtn);
    }

    function handleNextButton() {
        currentQuestionIndex++;
        if (currentQuestionIndex < quizData.length) {
            showQuestion();
            if (!reviewMode) {
                saveQuizState(); 
            }
        } else {
            if (reviewMode) {
                quizContent.style.display = 'none';
                scoreContainer.style.display = 'block';
                menuToggle.style.display = 'none';
                if(themeToggle) themeToggle.style.display = 'none';
            } else {
                showScore();
            }
        }
    }

    nextBtn.addEventListener("click", () => {
        handleNextButton();
    });

    // --- Inicialização ---

    initTheme(); // Inicializa o Dark Mode
    menuToggle.addEventListener('click', openNavMenu);
    navOverlay.addEventListener('click', closeNavMenu);
    menuToggle.style.display = 'none'; 
    if(themeToggle) themeToggle.style.display = 'none';

    const urlParams = new URLSearchParams(window.location.search);
    assunto = urlParams.get('assunto');
    quizStateKey = `quizState_${assunto}`; 

    if (!assunto) {
        showUIError("Nenhum assunto de quiz foi especificado na URL.");
        return;
    }

    const jsonPath = `data/dados_${assunto}.json`;

    fetch(jsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Falha ao carregar ${jsonPath}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                
                // [NOVA CORREÇÃO 3] Atualiza o Título da Aba
                // Converte "lpic101" para "LPIC-101" para ficar bonito
                const titleMap = {
                    'lpic101': 'LPIC-1 Exame 101',
                    'lpic102': 'LPIC-1 Exame 102',
                    'lpic201': 'LPIC-2 Exame 201',
                    'lpic202': 'LPIC-2 Exame 202'
                };
                // Se estiver no mapa usa ele, senão usa o texto puro em maiúsculo
                document.title = `Quiz ${titleMap[assunto] || assunto.toUpperCase()}`;
                quizData = data;
                
                const savedState = loadQuizState();
                // Verificação extra: só restaura se o número de questões bater (para evitar bugs se o JSON mudar)
                if (savedState && savedState.questions && savedState.questions.length === quizData.length) {
                    if (confirm("Encontramos um quiz em andamento. Deseja continuar de onde parou?")) {
                        startQuiz(savedState); 
                    } else {
                        clearQuizState(); 
                        startQuiz();
                    }
                } else {
                    startQuiz(); 
                }
                
                quizContent.style.display = 'block'; 
            } else {
                showUIError(`O arquivo de dados '${jsonPath}' está vazio ou mal formatado.`);
            }
        })
        .catch(err => {
            console.error(err);
            showUIError(`Falha ao carregar o arquivo de dados do quiz: '${jsonPath}'. Verifique se o arquivo existe.`);
        });
});
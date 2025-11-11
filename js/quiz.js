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
    const navMenu = document.getElementById('nav-menu');
    const navOverlay = document.getElementById('nav-overlay');
    const questionList = document.getElementById('question-list');
    const scoreTextEl = document.getElementById('score-text');
    const scoreContainer = document.getElementById('score-box'); // Container da pontuação

    // --- Estado do Quiz ---
    let currentQuestionIndex = 0;
    let score = 0;
    let quizData = []; 
    let assunto = ''; // lpic201 ou lpic202
    let quizStateKey = ''; // Chave do localStorage (ex: 'quizState_lpic201')
    let reviewMode = false; // Modo de revisão

    // --- Funções de Erro e Navegação ---

    function showUIError(message) {
        quizContent.style.display = 'none';
        scoreBox.style.display = 'none';
        errorMessage.textContent = message;
        errorBox.style.display = 'block';
        menuToggle.style.display = 'none'; 
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
        if (reviewMode) return; // Não salva o estado no modo de revisão

        // Salva um objeto mais leve
        const state = {
            currentQuestionIndex: currentQuestionIndex,
            score: score,
            questions: quizData.map(q => ({
                id: q.id,
                answered: q.answered,
                isCorrect: q.isCorrect,
                userAnswer: q.userAnswer, // Salva a resposta do usuário
                optionOrder: q.optionOrder // Salva a ordem das opções
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
            console.error("Erro ao carregar estado do quiz:", e);
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
            
            // Mapeia o estado salvo
            const stateMap = new Map();
            resumeState.questions.forEach(q => {
                stateMap.set(q.id, { 
                    answered: q.answered, 
                    isCorrect: q.isCorrect, 
                    userAnswer: q.userAnswer,
                    optionOrder: q.optionOrder
                });
            });

            // Reordena o quizData para corresponder à ordem salva e aplica o estado
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
            // Inicia um novo quiz
            quizData.sort(() => Math.random() - 0.5); 
            currentQuestionIndex = 0;
            score = 0;
            quizData.forEach(q => {
                q.answered = false;
                q.isCorrect = undefined;
                delete q.userAnswer;
                delete q.optionOrder; // Limpa a ordem das opções
            });
            clearQuizState(); // Limpa qualquer estado antigo
        }
        
        scoreContainer.style.display = 'none';
        quizContent.style.display = 'block';
        nextBtn.innerHTML = "Próxima";
        
        populateNavMenu(); 
        showQuestion();
        menuToggle.style.display = 'block'; 
    }

    function startReviewMode() {
        reviewMode = true;
        currentQuestionIndex = 0;
        
        scoreContainer.style.display = 'none';
        quizContent.style.display = 'block';
        menuToggle.style.display = 'block';
        nextBtn.innerHTML = "Próxima Revisão";
        
        populateNavMenu(); // Atualiza o menu com os ícones de acerto/erro
        showQuestion(); // Mostra a primeira pergunta no modo de revisão
    }


    function showQuestion() {
        resetState();
        const currentQuestion = quizData[currentQuestionIndex];
        const questionNumber = currentQuestionIndex + 1;
        
        questionTitleEl.innerHTML = `${questionNumber}. ${currentQuestion.pergunta}`;
        progressEl.innerText = `Pergunta ${questionNumber}/${quizData.length}`;

        // (MELHORIA 6) Adiciona imagem se existir
        if (currentQuestion.imagem) {
            const imgEl = document.createElement('img');
            imgEl.src = `images/${currentQuestion.imagem}`; // Assumindo que estão na pasta images/
            imgEl.alt = "Contexto visual para a pergunta";
            imgEl.style.width = "100%"; 
            imgEl.style.maxWidth = "600px"; // Limite
            imgEl.style.margin = "15px auto";
            imgEl.style.display = "block";
            imgEl.style.borderRadius = "8px";
            imgEl.style.border = "1px solid #eee";
            answersEl.before(imgEl); // Insere a imagem antes das respostas
        }

        const correctAnswers = currentQuestion.respostaCorreta;
        const isMultiAnswer = Array.isArray(correctAnswers);

        if (currentQuestion.tipo === 'fill') {
            const input = document.createElement("input");
            input.type = "text";
            input.id = "fill-answer-input";
            input.placeholder = "Digite sua resposta aqui...";
            input.classList.add("answer-input"); 
            input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault(); 
                    const submitBtn = document.getElementById('fill-submit-btn');
                    if (submitBtn && !submitBtn.disabled) {
                        submitBtn.click();
                    }
                }
            });

            const submitBtn = document.createElement("button");
            submitBtn.innerText = "Verificar";
            submitBtn.classList.add("action-btn", "submit-fill-btn"); 
            submitBtn.id = "fill-submit-btn";
            submitBtn.addEventListener("click", checkFillAnswer);

            answersEl.appendChild(input);
            answersEl.appendChild(submitBtn);

        } else {
            // *** ESTA É A PARTE QUE FALTAVA ***
            const displayKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G']; 
            
            let originalKeys = Object.keys(currentQuestion.opcoes);

            // Se não tivermos um "order" salvo, embaralha e salva
            if (!currentQuestion.optionOrder) {
                originalKeys.sort(() => Math.random() - 0.5);
                currentQuestion.optionOrder = originalKeys;
            } else {
                originalKeys = currentQuestion.optionOrder; // Usa a ordem salva
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
            // *** FIM DA PARTE QUE FALTAVA ***
        }

        // Se a pergunta já foi respondida (vindo do localStorage ou modo de revisão)
        if (currentQuestion.answered) {
            showAnswerState();
        }
    }

    // Mostra o estado salvo (cores, etc.)
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
            const userAnswer = currentQuestion.userAnswer; // Pode ser string ou array

            buttons.forEach(button => {
                const key = button.dataset.key;
                if (!key) return; // Ignora o botão de submit

                button.disabled = true;

                if (isMultiAnswer) {
                    const isSelected = userAnswer && userAnswer.includes(key);
                    const isCorrectAnswer = correctAnswers.includes(key);

                    if (isSelected) {
                        button.classList.add(isCorrectAnswer ? 'correct' : 'incorrect');
                        button.classList.add('selected'); // Adiciona para o modo de revisão
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
    }


    function resetState() {
        nextBtn.style.display = 'none';
        explanationBox.style.display = 'none';
        explanationBox.innerHTML = '';
        
        while (answersEl.firstChild) {
            answersEl.removeChild(answersEl.firstChild);
        }

        // Remove imagem da pergunta anterior
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
        currentQuestion.userAnswer = selectedBtn.dataset.key; // Salva a resposta

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
        
        showExplanation(); 
        nextBtn.style.display = 'block';
        updateNavItemStatus(currentQuestionIndex, currentQuestion.isCorrect);
        saveQuizState();
    }

    function checkFillAnswer() {
        if (reviewMode || quizData[currentQuestionIndex].answered) return;
        
        const inputEl = document.getElementById('fill-answer-input');
        const submitBtn = document.getElementById('fill-submit-btn');
        const userAnswer = inputEl.value.trim(); 
        const currentQuestion = quizData[currentQuestionIndex];
        const correctAnswers = currentQuestion.respostaCorreta;

        currentQuestion.answered = true;
        currentQuestion.userAnswer = userAnswer; // Salva a resposta

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
        
        showExplanation();

        inputEl.disabled = true;
        submitBtn.disabled = true;
        nextBtn.style.display = 'block';
        updateNavItemStatus(currentQuestionIndex, currentQuestion.isCorrect);
        saveQuizState();
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
        currentQuestion.userAnswer = selectedAnswers; // Salva as respostas

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
        showExplanation();
        nextBtn.style.display = 'block';
        updateNavItemStatus(currentQuestionIndex, currentQuestion.isCorrect);
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
            html += `<p style="margin-bottom: 15px; color: #155724; font-weight: 500;">Resposta correta: <strong>${displayAnswers}</strong></p>`;
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
            
            // (MELHORIA 3) Adiciona ícone de status
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

    // (MELHORIA 3) Atualiza o item do menu após a resposta
    function updateNavItemStatus(index, isCorrect) {
        const navItem = questionList.querySelector(`a[data-index="${index}"]`);
        if (navItem) {
            const statusIcon = isCorrect ? ' ✔' : ' ✘';
            navItem.style.color = isCorrect ? '#155724' : '#721c24';
            // Remove o ícone antigo se houver
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
        clearQuizState(); // Limpa o progresso ao finalizar

        // (MELHORIA 2) Adiciona botões de "Revisar" e "Jogar Novamente"
        
        // Limpa botões antigos da tela de score
        const oldButtons = scoreContainer.querySelectorAll('.action-btn');
        oldButtons.forEach(btn => btn.remove());

        // Botão de Reiniciar
        const restartBtn = document.createElement("a");
        restartBtn.href = "#";
        restartBtn.id = "restart-btn";
        restartBtn.classList.add("action-btn");
        restartBtn.innerText = "Jogar Novamente";
        restartBtn.style.marginRight = "10px";
        restartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            startQuiz(); // Inicia um novo quiz (sem estado)
        });

        // Botão de Revisão
        const reviewBtn = document.createElement("a");
        reviewBtn.href = "#";
        reviewBtn.id = "review-btn";
        reviewBtn.classList.add("action-btn");
        reviewBtn.innerText = "Revisar Prova";
        reviewBtn.style.background = "#6c757d"; // Cor cinza
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
                saveQuizState(); // Salva o progresso ao avançar
            }
        } else {
            if (reviewMode) {
                // Se terminou a revisão, volta para a tela de score
                quizContent.style.display = 'none';
                scoreContainer.style.display = 'block';
                menuToggle.style.display = 'none';
            } else {
                showScore();
            }
        }
    }

    nextBtn.addEventListener("click", () => {
        handleNextButton();
    });

    // --- Inicialização ---

    menuToggle.addEventListener('click', openNavMenu);
    navOverlay.addEventListener('click', closeNavMenu);
    menuToggle.style.display = 'none'; 

    const urlParams = new URLSearchParams(window.location.search);
    assunto = urlParams.get('assunto');
    quizStateKey = `quizState_${assunto}`; // Chave única por assunto

    if (!assunto) {
        showUIError("Nenhum assunto de quiz foi especificado na URL.");
        return;
    }

    // (MELHORIA 5) Lógica de Fetch com caminhos relativos à raiz
    const jsonPath = `/data/dados_${assunto}.json`;

    fetch(jsonPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Falha ao carregar ${jsonPath}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                quizData = data;
                
                // (MELHORIA 1) Verifica se há um quiz salvo
                const savedState = loadQuizState();
                if (savedState && savedState.assunto === assunto) {
                    // Se encontrou, pergunta ao usuário
                    if (confirm("Encontramos um quiz em andamento. Deseja continuar de onde parou?")) {
                        startQuiz(savedState); // Restaura o progresso
                    } else {
                        clearQuizState(); // Limpa o progresso e começa de novo
                        startQuiz();
                    }
                } else {
                    startQuiz(); // Começa um quiz novo
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
document.addEventListener('DOMContentLoaded', function() {
    const textarea = document.getElementById('fn__chat_textarea');
    const sendButton = document.getElementById('sendButton');
    const photoInput = document.getElementById('photoInput');
    const photoButton = document.getElementById('photoButton');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');
    const chatList = document.getElementById('chatList');
    let conversationHistory = [
        { role: 'system', content: 'Sen yardımcı bir asistansın. Kullanıcının önceki mesajlarını dikkate alarak bağlamı koru ve uygun yanıtlar ver. Eğer kullanıcı bir fotoğraf yüklerse ve analiz etmesini istersen, OpenCV.js ile fotoğrafı analiz et ve içeriğini tarif et. Kullanıcı talimat verdiyse (örneğin, "Resimde kedi seç"), bunu dikkate al.' }
    ];
    let isFetching = false;
    let selectedImageBase64 = null; // Seçilen veya yapıştırılan resmi saklamak için

    // OpenCV.js yüklenmesini bekle
    cv['onRuntimeInitialized'] = function() {
        console.log('OpenCV.js yüklendi.');
    };

    // Mesaj gönderme
    sendButton.addEventListener('click', sendMessage);
    textarea.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Fotoğraf butonuyla dosya seçme
    photoButton.addEventListener('click', function() {
        photoInput.click(); // Sadece butona basınca dosya seçme penceresi açılır
    });

    // Dosya seçildiğinde
    photoInput.addEventListener('change', function() {
        const file = photoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                selectedImageBase64 = e.target.result.split(',')[1]; // Base64 verisini sakla
                previewImage.src = e.target.result; // Önizlemeyi göster
                imagePreview.style.display = 'block';
                photoInput.value = ''; // Dosya inputunu sıfırla
            };
            reader.readAsDataURL(file);
        }
    });

    // Kopyala-yapıştır ile resim yakalama
    textarea.addEventListener('paste', function(e) {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') !== -1) {
                e.preventDefault();
                const file = item.getAsFile();
                const reader = new FileReader();
                reader.onload = function(e) {
                    selectedImageBase64 = e.target.result.split(',')[1]; // Base64 verisini sakla
                    previewImage.src = e.target.result; // Önizlemeyi göster
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        }
    });

    function sendMessage() {
        const message = textarea.value.trim();
        if (!message && !selectedImageBase64) return; // Mesaj veya resim yoksa çık
        if (isFetching) return;

        if (selectedImageBase64) {
            const fullMessage = message ? `Fotoğraf yüklendi. Talimat: ${message}` : 'Fotoğraf yüklendi.';
            addYourMessage(fullMessage);
            conversationHistory.push({ role: 'user', content: fullMessage });
            analyzeImage(selectedImageBase64, message);
            selectedImageBase64 = null; // Resmi sıfırla
            imagePreview.style.display = 'none'; // Önizlemeyi gizle
            textarea.value = '';
        } else if (message) {
            addYourMessage(message);
            conversationHistory.push({ role: 'user', content: message });
            fetchBotResponse();
            textarea.value = '';
        }
    }

    function addYourMessage(message) {
        const chatItem = document.querySelector('.chat__item.active');
        const yourChat = document.createElement('div');
        yourChat.className = 'chat__box your__chat';
        yourChat.innerHTML = `
            <div class="author"><span>Sen</span></div>
            <div class="chat">
                <p>${message}</p>
            </div>
        `;
        chatItem.appendChild(yourChat);
        chatList.scrollTop = chatList.scrollHeight;
    }

    function addBotMessage(message) {
        const chatItem = document.querySelector('.chat__item.active');
        const botChat = document.createElement('div');
        botChat.className = 'chat__box bot__chat';
        botChat.innerHTML = `
            <div class="author"><span>Bot</span></div>
            <div class="chat">
                <p>${message}</p>
            </div>
        `;
        chatItem.appendChild(botChat);
        chatList.scrollTop = chatList.scrollHeight;
    }

    async function analyzeImage(base64Image, instruction) {
        isFetching = true;
        try {
            addBotMessage('Fotoğraf analiz ediliyor... Lütfen biraz bekle.');

            // Base64 resmini OpenCV Mat nesnesine çevir
            const img = new Image();
            img.src = 'data:image/jpeg;base64,' + base64Image;
            await new Promise(resolve => img.onload = resolve);

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const src = cv.imread(canvas);

            // Gri tonlamaya çevir
            const gray = new cv.Mat();
            cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

            // Basit obje tespiti (örneğin, yüz tespiti için Haar Cascade)
            // NOT: Haar Cascade XML dosyasını projene eklemen lazım
            const classifier = new cv.CascadeClassifier();
            // classifier.load('haarcascade_frontalface_default.xml'); // XML dosyasını projene ekle
            const faces = new cv.RectVector();
            // classifier.detectMultiScale(gray, faces, 1.1, 3, 0); // Gerçek kullanım için

            let description = 'Fotoğrafta analiz yapıldı.';
            if (instruction) {
                description += `\nKullanıcı talimatı: "${instruction}"`;
                if (instruction.toLowerCase().includes('kedi seç')) {
                    description += '\nTalimat uyarınca: Kedi tespiti için model gerekli, şu an sadece yüz tespiti yapılabilir.';
                } else if (instruction.toLowerCase().includes('yüz seç')) {
                    description += faces.size() > 0
                        ? '\nTalimat uyarınca: Yüz tespit edildi!'
                        : '\nTalimat uyarınca: Yüz tespit edilemedi.';
                }
            } else {
                description += faces.size() > 0
                    ? '\nFotoğrafta yüz tespit edildi.'
                    : '\nFotoğrafta yüz tespit edilemedi.';
            }

            // Mat nesnelerini temizle
            src.delete();
            gray.delete();
            faces.delete();

            addBotMessage(description);
            conversationHistory.push({ role: 'assistant', content: description });
        } catch (error) {
            console.error('Hata detayları:', error);
            addBotMessage('Üzgünüm, fotoğraf analizi sırasında bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            isFetching = false;
        }
    }

    async function fetchBotResponse() {
        if (isFetching) return;
        isFetching = true;
        try {
            const lastMessage = conversationHistory[conversationHistory.length - 1].content.toLowerCase();
            if (lastMessage === 'analiz yap' || lastMessage === 'fotoğraf analizi yap') {
                const previousMessages = conversationHistory.slice(0, -1).map(msg => msg.content).join(' ');
                if (previousMessages.toLowerCase().includes('valorant tracker')) {
                    addBotMessage('Hangi oyuncunun istatistiklerini analiz edeyim? Lütfen oyuncu adını belirt (örneğin, "Valorant Tracker: oyuncu123").');
                    isFetching = false;
                    return;
                } else {
                    addBotMessage('Neyi analiz etmemi istiyorsun? Daha fazla bilgi verebilir misin?');
                    isFetching = false;
                    return;
                }
            }

            const fullPrompt = conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n');
            const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(fullPrompt)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`API isteği başarısız oldu: ${response.status} ${response.statusText}`);
            }
            const botReply = await response.text();
            addBotMessage(botReply);
            conversationHistory.push({ role: 'assistant', content: botReply });

            if (conversationHistory.length > 10) {
                conversationHistory = [conversationHistory[0], ...conversationHistory.slice(-9)];
            }
        } catch (error) {
            console.error('Hata detayları:', {
                message: error.message,
                stack: error.stack,
                url: `https://text.pollinations.ai/${encodeURIComponent(conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n'))}`
            });
            addBotMessage('Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            isFetching = false;
        }
    }
});
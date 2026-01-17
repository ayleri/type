// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let score = 0;
let gameOver = false;

// Player object
const player = {
    x: 100,
    y: 100,
    width: 30,
    height: 30,
    velocityX: 0,
    velocityY: 0,
    speed: 5,
    jumpPower: 12,
    onGround: false,
    color: '#FF6B6B'
};

// Gravity
const gravity = 0.5;

// Platforms
const platforms = [
    { x: 0, y: 550, width: 800, height: 50, color: '#2ECC71' },      // Ground
    { x: 150, y: 450, width: 150, height: 20, color: '#3498DB' },
    { x: 400, y: 380, width: 120, height: 20, color: '#3498DB' },
    { x: 600, y: 300, width: 150, height: 20, color: '#3498DB' },
    { x: 250, y: 250, width: 100, height: 20, color: '#3498DB' },
    { x: 500, y: 180, width: 120, height: 20, color: '#3498DB' },
    { x: 100, y: 120, width: 100, height: 20, color: '#3498DB' }
];

// Collectible coins
let coins = [
    { x: 200, y: 410, width: 20, height: 20, collected: false },
    { x: 450, y: 340, width: 20, height: 20, collected: false },
    { x: 650, y: 260, width: 20, height: 20, collected: false },
    { x: 300, y: 210, width: 20, height: 20, collected: false },
    { x: 550, y: 140, width: 20, height: 20, collected: false },
    { x: 150, y: 80, width: 20, height: 20, collected: false }
];

// Keyboard input
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    
    // Restart game
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Reset game
function resetGame() {
    player.x = 100;
    player.y = 100;
    player.velocityX = 0;
    player.velocityY = 0;
    score = 0;
    gameOver = false;
    
    // Reset coins
    coins.forEach(coin => {
        coin.collected = false;
    });
    
    updateScore();
}

// Update score display
function updateScore() {
    document.getElementById('score').textContent = `Score: ${score}`;
}

// Check collision between two rectangles
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update game state
function update() {
    if (gameOver) return;
    
    // Horizontal movement
    if (keys['ArrowLeft']) {
        player.velocityX = -player.speed;
    } else if (keys['ArrowRight']) {
        player.velocityX = player.speed;
    } else {
        player.velocityX = 0;
    }
    
    // Jump
    if ((keys['ArrowUp'] || keys[' ']) && player.onGround) {
        player.velocityY = -player.jumpPower;
        player.onGround = false;
    }
    
    // Apply gravity
    player.velocityY += gravity;
    
    // Update position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Keep player within canvas bounds (horizontally)
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
    
    // Check if player fell off screen
    if (player.y > canvas.height) {
        gameOver = true;
    }
    
    // Platform collision
    player.onGround = false;
    
    platforms.forEach(platform => {
        if (checkCollision(player, platform)) {
            // Check if player is falling onto platform
            if (player.velocityY > 0 && 
                player.y + player.height - player.velocityY <= platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
            }
            // Check if player hits platform from below
            else if (player.velocityY < 0 && 
                     player.y - player.velocityY >= platform.y + platform.height) {
                player.y = platform.y + platform.height;
                player.velocityY = 0;
            }
            // Check horizontal collision
            else if (player.velocityX > 0) {
                player.x = platform.x - player.width;
            } else if (player.velocityX < 0) {
                player.x = platform.x + platform.width;
            }
        }
    });
    
    // Coin collection
    coins.forEach(coin => {
        if (!coin.collected && checkCollision(player, coin)) {
            coin.collected = true;
            score += 10;
            updateScore();
        }
    });
}

// Draw game
function draw() {
    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw platforms
    platforms.forEach(platform => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Add border to platforms
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    });
    
    // Draw coins
    coins.forEach(coin => {
        if (!coin.collected) {
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(coin.x + coin.width/2, coin.y + coin.height/2, coin.width/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFA500';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
    
    // Draw player
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Add border to player
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);
    
    // Draw eyes
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 8, player.y + 8, 5, 5);
    ctx.fillRect(player.x + 17, player.y + 8, 5, 5);
    
    // Game over message
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFF';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 30);
        
        ctx.font = '24px Arial';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 60);
    }
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
updateScore();
gameLoop();

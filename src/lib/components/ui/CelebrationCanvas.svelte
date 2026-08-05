<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { celebrationSignal } from '$lib/stores/celebrationStore';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D | null;
	let animationFrameId: number;
	let particles: any[] = [];
	let canvasWidth = 0;
	let canvasHeight = 0;
	let textPopup: { message: string; life: number; elapsed: number } | null = null;

	const colors = ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316'];

	const celebrationMessages = [
		'Nice work!',
		'Crushed it!',
		'Boom! Done.',
		"You're on a roll!",
		'Shipped it!',
		'Great job!',
		'Task complete!',
		'Nailed it!',
		'One down!',
		'Keep it up!'
	];

	function resizeCanvas() {
		if (canvas) {
			canvasWidth = window.innerWidth;
			canvasHeight = window.innerHeight;
			canvas.width = canvasWidth;
			canvas.height = canvasHeight;
		}
	}

	function spawnConfetti() {
		for (let i = 0; i < 150; i++) {
			particles.push({
				x: canvasWidth / 2 + (Math.random() - 0.5) * canvasWidth * 0.8,
				y: -50 - Math.random() * 200,
				vx: (Math.random() - 0.5) * 4,
				vy: Math.random() * 3 + 2,
				size: Math.random() * 10 + 5,
				color: colors[Math.floor(Math.random() * colors.length)],
				rotation: Math.random() * Math.PI * 2,
				rotationSpeed: (Math.random() - 0.5) * 0.2,
				type: Math.random() > 0.5 ? 'rect' : 'circle',
				life: 1,
				decay: 0
			});
		}
	}

	function spawnRocket() {
		particles.push({
			x: canvasWidth * 0.15,
			y: canvasHeight + 40,
			vx: canvasWidth / 450,
			vy: -canvasHeight / 110,
			size: 60,
			color: '#e2e8f0',
			life: 1,
			decay: 0.003,
			type: 'rocket',
			trail: []
		});
	}

	function spawnStarburst() {
		const cx = canvasWidth / 2;
		const cy = canvasHeight / 2;
		for (let i = 0; i < 100; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = Math.random() * 15 + 5;
			particles.push({
				x: cx,
				y: cy,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				size: Math.random() * 4 + 2,
				color: colors[Math.floor(Math.random() * colors.length)],
				life: 1,
				decay: Math.random() * 0.02 + 0.01,
				type: 'star'
			});
		}
	}

	function spawnSupernova() {
		const cx = canvasWidth / 2;
		const cy = canvasHeight / 2;
		// Ring
		particles.push({
			x: cx,
			y: cy,
			radius: 10,
			life: 1,
			decay: 0.02,
			type: 'ring'
		});
		// Orbs
		for (let i = 0; i < 50; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = Math.random() * 8 + 2;
			particles.push({
				x: cx,
				y: cy,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				size: Math.random() * 8 + 4,
				color: colors[Math.floor(Math.random() * colors.length)],
				life: 1,
				decay: Math.random() * 0.015 + 0.005,
				type: 'orb'
			});
		}
	}

	function spawnAlien() {
		particles.push({
			x: -120,
			y: canvasHeight * 0.28,
			vx: canvasWidth / 140,
			vy: 0,
			size: 80,
			life: 1,
			decay: 0.0011,
			type: 'alien',
			elapsed: 0
		});
	}

	function triggerEffect(type: string) {
		let effType = type;
		if (type === 'random') {
			const types = ['rocket', 'starburst', 'confetti', 'supernova', 'alien'];
			effType = types[Math.floor(Math.random() * types.length)];
		}

		if (effType === 'confetti') spawnConfetti();
		else if (effType === 'rocket') spawnRocket();
		else if (effType === 'starburst') spawnStarburst();
		else if (effType === 'supernova') spawnSupernova();
		else if (effType === 'alien') spawnAlien();

		textPopup = {
			message: celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)],
			life: 1,
			elapsed: 0
		};
	}

	function drawTextPopup() {
		if (!ctx || !textPopup) return;

		const t = textPopup.elapsed;
		const appear = Math.min(1, (1 - textPopup.life) * 8);
		const fade = textPopup.life < 0.3 ? textPopup.life / 0.3 : 1;
		const alpha = appear * fade;
		const fontSize = Math.min(56, canvasWidth * 0.05);

		// Spring-pop scale on entry, then subtle breathe pulse
		const entryBounce = 0.6 + 0.4 * appear + Math.sin(appear * Math.PI) * 0.1;
		const breathe = 1 + Math.sin(t * 2.4) * 0.018;
		const scaleX = entryBounce * breathe;
		const scaleY = entryBounce * (1 / breathe); // counter-squeeze for organic feel

		// Vertical float
		const floatY = Math.sin(t * 1.8) * 6;

		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.translate(canvasWidth / 2, canvasHeight / 2 + floatY);
		ctx.scale(scaleX, scaleY);
		ctx.font = `700 ${fontSize}px system-ui, -apple-system, sans-serif`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';

		// Drop shadow
		const isDark = document.documentElement.classList.contains('dark');
		ctx.shadowColor = isDark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.22)';
		ctx.shadowBlur = 18;
		ctx.shadowOffsetY = 3;

		// Moving rainbow gradient sweep across the text width
		const metrics = ctx.measureText(textPopup.message);
		const tw = metrics.width;
		const sweepOffset = ((t * 0.4) % 1) * tw * 2 - tw;
		const grad = ctx.createLinearGradient(-tw / 2 + sweepOffset, 0, tw / 2 + sweepOffset, 0);
		grad.addColorStop(0,    '#f43f5e');
		grad.addColorStop(0.18, '#f97316');
		grad.addColorStop(0.36, '#eab308');
		grad.addColorStop(0.54, '#10b981');
		grad.addColorStop(0.72, '#3b82f6');
		grad.addColorStop(0.90, '#a855f7');
		grad.addColorStop(1,    '#f43f5e');
		ctx.fillStyle = grad;
		ctx.fillText(textPopup.message, 0, 0);

		ctx.restore();
	}

	function animate() {
		if (!ctx) return;
		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		for (let i = particles.length - 1; i >= 0; i--) {
			const p = particles[i];
			p.life -= p.decay;

			if (p.life <= 0 || p.y > canvasHeight + 100 || p.x > canvasWidth + 100) {
				particles.splice(i, 1);
				continue;
			}

			if (p.type === 'rect' || p.type === 'circle') {
				p.x += p.vx;
				p.y += p.vy;
				p.vy += 0.1; // gravity
				p.rotation += p.rotationSpeed;
				
				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(p.rotation);
				ctx.fillStyle = p.color;
				if (p.type === 'rect') {
					ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
				} else {
					ctx.beginPath();
					ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.restore();
			} else if (p.type === 'rocket') {
				p.x += p.vx;
				p.y += p.vy;
				p.vy -= 0.03; // accelerate up

				// Thruster jet trail — bigger, denser, and brighter near the nozzle
				const tailAngle = Math.atan2(p.vy, p.vx) + Math.PI;
				for (let j = 0; j < 3; j++) {
					particles.push({
						x: p.x + Math.cos(tailAngle) * p.size * 0.9 + (Math.random() - 0.5) * p.size * 0.4,
						y: p.y + Math.sin(tailAngle) * p.size * 0.9 + (Math.random() - 0.5) * p.size * 0.4,
						vx: Math.cos(tailAngle) * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 1.5,
						vy: Math.sin(tailAngle) * (Math.random() * 3 + 1) + (Math.random() - 0.5) * 1.5,
						size: Math.random() * 10 + 6,
						color: Math.random() > 0.4 ? '#f97316' : '#facc15',
						life: 1,
						decay: 0.035,
						type: 'star'
					});
				}

				ctx.save();
				ctx.translate(p.x, p.y);
				ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);

				const s = p.size;
				// Fins
				ctx.fillStyle = '#6366f1';
				ctx.beginPath();
				ctx.moveTo(-s * 0.28, s * 0.35);
				ctx.lineTo(-s * 0.75, s);
				ctx.lineTo(-s * 0.15, s * 0.75);
				ctx.closePath();
				ctx.fill();
				ctx.beginPath();
				ctx.moveTo(s * 0.28, s * 0.35);
				ctx.lineTo(s * 0.75, s);
				ctx.lineTo(s * 0.15, s * 0.75);
				ctx.closePath();
				ctx.fill();

				// Body
				ctx.fillStyle = p.color;
				ctx.beginPath();
				ctx.moveTo(0, -s);
				ctx.quadraticCurveTo(s * 0.55, -s * 0.2, s * 0.4, s * 0.8);
				ctx.lineTo(-s * 0.4, s * 0.8);
				ctx.quadraticCurveTo(-s * 0.55, -s * 0.2, 0, -s);
				ctx.closePath();
				ctx.fill();

				// Nose cone accent
				ctx.fillStyle = '#f43f5e';
				ctx.beginPath();
				ctx.moveTo(0, -s);
				ctx.lineTo(s * 0.3, -s * 0.45);
				ctx.lineTo(-s * 0.3, -s * 0.45);
				ctx.closePath();
				ctx.fill();

				// Window
				ctx.fillStyle = '#0ea5e9';
				ctx.beginPath();
				ctx.arc(0, -s * 0.05, s * 0.18, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = '#e2e8f0';
				ctx.lineWidth = Math.max(1, s * 0.03);
				ctx.stroke();

				ctx.restore();
			} else if (p.type === 'star' || p.type === 'orb') {
				p.x += p.vx;
				p.y += p.vy;
				p.vx *= 0.95; // friction
				p.vy *= 0.95;
				
				ctx.globalAlpha = p.life;
				ctx.fillStyle = p.color;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
			} else if (p.type === 'ring') {
				p.radius += 10;
				ctx.globalAlpha = p.life;
				ctx.strokeStyle = '#0ea5e9';
				ctx.lineWidth = 5;
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
				ctx.stroke();
				ctx.globalAlpha = 1;
			} else if (p.type === 'alien') {
				p.x += p.vx;
				p.elapsed += 0.04;
				// Gentle sine bob
				const bob = Math.sin(p.elapsed * 2.5) * 12;
				const drawY = p.y + bob;
				const s = p.size;
				// Beam pulse: width and opacity oscillate
				const beamPulse = 0.55 + Math.sin(p.elapsed * 5) * 0.2;
				const beamAlpha = (0.28 + Math.sin(p.elapsed * 5) * 0.12) * p.life;
				const beamHalfTop = s * 0.42 * beamPulse;
				const beamHalfBot = s * 1.1 * beamPulse;
				const beamLength = canvasHeight - drawY;

				ctx.save();
				ctx.globalAlpha = beamAlpha;
				// Tractor beam cone — gradient from bright green at ship to transparent
				const beamGrad = ctx.createLinearGradient(p.x, drawY + s * 0.45, p.x, drawY + s * 0.45 + beamLength);
				beamGrad.addColorStop(0,   'rgba(74, 222, 128, 0.85)');
				beamGrad.addColorStop(0.4, 'rgba(74, 222, 128, 0.35)');
				beamGrad.addColorStop(1,   'rgba(74, 222, 128, 0)');
				ctx.fillStyle = beamGrad;
				ctx.beginPath();
				ctx.moveTo(p.x - beamHalfTop, drawY + s * 0.45);
				ctx.lineTo(p.x + beamHalfTop, drawY + s * 0.45);
				ctx.lineTo(p.x + beamHalfBot, drawY + s * 0.45 + beamLength * 0.75);
				ctx.lineTo(p.x - beamHalfBot, drawY + s * 0.45 + beamLength * 0.75);
				ctx.closePath();
				ctx.fill();
				ctx.restore();

				// Beam edge sparkles
				if (Math.random() < 0.4) {
					const sparkT = Math.random();
					const sparkHalf = beamHalfTop + (beamHalfBot - beamHalfTop) * sparkT;
					const side = Math.random() > 0.5 ? 1 : -1;
					particles.push({
						x: p.x + side * sparkHalf * (0.85 + Math.random() * 0.2),
						y: drawY + s * 0.45 + beamLength * 0.75 * sparkT,
						vx: side * (Math.random() * 1.2 + 0.4),
						vy: (Math.random() - 0.5) * 1.2,
						size: Math.random() * 2.5 + 1,
						color: Math.random() > 0.5 ? '#4ade80' : '#a3e635',
						life: 1,
						decay: 0.06 + Math.random() * 0.04,
						type: 'star'
					});
				}

				ctx.save();
				ctx.globalAlpha = p.life;
				ctx.translate(p.x, drawY);

				// Saucer undercarriage (flat disc)
				const discGrad = ctx.createRadialGradient(0, s * 0.1, s * 0.05, 0, s * 0.1, s * 0.5);
				discGrad.addColorStop(0, '#94a3b8');
				discGrad.addColorStop(0.6, '#64748b');
				discGrad.addColorStop(1, '#334155');
				ctx.fillStyle = discGrad;
				ctx.beginPath();
				ctx.ellipse(0, s * 0.12, s * 0.72, s * 0.22, 0, 0, Math.PI * 2);
				ctx.fill();

				// Metallic rim highlight
				ctx.strokeStyle = '#cbd5e1';
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.ellipse(0, s * 0.12, s * 0.72, s * 0.22, 0, Math.PI, Math.PI * 2);
				ctx.stroke();

				// Running lights along rim — 5 evenly spaced, blinking
				const lightColors = ['#f43f5e', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];
				for (let li = 0; li < 5; li++) {
					const lAngle = (li / 5) * Math.PI * 2 + p.elapsed * 1.5;
					const lx = Math.cos(lAngle) * s * 0.6;
					const ly = s * 0.12 + Math.sin(lAngle) * s * 0.1;
					const blink = 0.5 + 0.5 * Math.sin(p.elapsed * 8 + li * 1.3);
					ctx.globalAlpha = blink * p.life;
					ctx.fillStyle = lightColors[li];
					ctx.beginPath();
					ctx.arc(lx, ly, 4, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.globalAlpha = p.life;

				// Dome (upper cockpit)
				const domeGrad = ctx.createRadialGradient(-s * 0.1, -s * 0.28, s * 0.02, 0, -s * 0.15, s * 0.42);
				domeGrad.addColorStop(0, 'rgba(186,230,253,0.95)');
				domeGrad.addColorStop(0.45, 'rgba(56,189,248,0.8)');
				domeGrad.addColorStop(1, 'rgba(14,165,233,0.4)');
				ctx.fillStyle = domeGrad;
				ctx.beginPath();
				ctx.ellipse(0, s * 0.05, s * 0.38, s * 0.32, 0, Math.PI, Math.PI * 2);
				ctx.fill();

				// Dome rim
				ctx.strokeStyle = 'rgba(186,230,253,0.6)';
				ctx.lineWidth = 1.5;
				ctx.beginPath();
				ctx.ellipse(0, s * 0.05, s * 0.38, s * 0.07, 0, 0, Math.PI * 2);
				ctx.stroke();

				ctx.restore();
			}
		}

		if (textPopup) {
			textPopup.life -= 0.008;
			textPopup.elapsed += 0.016;
			if (textPopup.life <= 0) {
				textPopup = null;
			} else {
				drawTextPopup();
			}
		}

		animationFrameId = requestAnimationFrame(animate);
	}

	onMount(() => {
		ctx = canvas.getContext('2d');
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		animationFrameId = requestAnimationFrame(animate);

		const unsubscribe = celebrationSignal.subscribe(signal => {
			if (signal) {
				triggerEffect(signal.type);
			}
		});

		return () => {
			unsubscribe();
			window.removeEventListener('resize', resizeCanvas);
			cancelAnimationFrame(animationFrameId);
		};
	});

	onDestroy(() => {
		if (animationFrameId) {
			cancelAnimationFrame(animationFrameId);
		}
	});
</script>

<canvas
	bind:this={canvas}
	class="pointer-events-none fixed inset-0 z-[100]"
></canvas>

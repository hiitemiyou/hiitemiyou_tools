// for YouTubeAPI
var videoWidth  = '448';  //動画横サイズ
var videoHeight = '336';  //動画縦サイズ
var player;
var videoSetFlag = false;

// for CANVAS
const CANVAS_WIDTH = 448;
const CANVAS_HEIGHT = 504;

// for FRET BORAD
const FRET_LEFT_MARGIN_X = 40;
const FRET_RIGHT_MARGIN_X = 10;
var FRET_WIDTH = CANVAS_WIDTH - (FRET_LEFT_MARGIN_X + FRET_RIGHT_MARGIN_X); // 428
const FRET_MARGIN_Y = 10;
const FRET_HEIGHT = 100;

// for TIMING
const TIMING_WIDTH = 15;
const TIMING_HEIGHT = 5;
var TIMING_BOTTOM_Y = FRET_HEIGHT + FRET_MARGIN_Y;

// for MUTE
const MUTE_WIDTH = 10;

// for NOTE
const NOTE_RADIUS = 5;

// for CHORD
const CHORD_NAME_HEIGHT = 70;

// for FPS
const FRAME_PERIOD = 2;
var frameCount = 0;

// for explain
var targetExplainFlag = false;

// for data
var music;

// for numOfString
const DEFAULT_NUM_OF_STRING = 6;

function isNull(value) {
    if(value === null || value === undefined) {
        return true;
    } else {
        return false;
    }
}

/**
 * 曲
 */
class Music{
    youtubeId;
    version;
    fall;
    explain;
    chords = [];
    numOfString = DEFAULT_NUM_OF_STRING;
    /**
     * 落ちているコード
     * @param {*} now 現在時刻(秒)
     * @returns 描くべきコード
     */
    droppingChord(now) {
        let array = [];
        for(var i = 0; i < this.chords.length; i++) {
            if(this.chords[i].startTime <= now && this.chords[i].time >= now) {
                array.push(this.chords[i]);
            }
        }
        return array;
    }
    /**
     * 落ちてしまったコード
     * @param {*} now 現在時刻(秒)
     * @returns 描くべきコード
     */
    droppedChord(now) {
        let array = [];
        for(var i = 0; i < this.chords.length; i++) {
            if(this.chords[i].time <= now && this.chords[i].endTime >= now) {
                array.push(this.chords[i]);
            }
        }
        return array;
    }
}

/**
 * コード
 */
class Chord{
    time;
    chordName;
    chord;
    startTime;
    endTime;
    notes= [];
    /**
     * 位置の割合
     * @param {*} now 現在時刻(秒)
     * @returns 位置の割合
     */
    getRate(now) {
        if(this.startTime > now) {
            return 0;
        } else if(this.startTime <= now && this.time >= now) {
            return (now - this.startTime) / (this.time - this.startTime);
        } else if(this.time < now ) {
            return 1;
        }
    }

    /**
     * 不透明度
     * @param {*} now 現在時刻(秒)
     * @returns 不透明度
     */
    getTimingAlpha(now) {
        if(this.time > now) {
            return 0;
        } else {
            let alfa = 0.6 - (now - this.time) / 0.6;
            if(alfa < 0) {
                return 0;
            } else {
                return alfa;
            }
        }
    }
    /**
     * 高さの割合
     * @param {*} now 現在時刻(秒)
     * @returns 高さの割合
     */
    getTimingLength(now) {
        return 1 - this.getTimingAlpha(now);
    }
}
/**
 * 音符
 */
class Note {
    string;
    fret;
}

function initialize(){
    topTag = document.getElementById("hiitemiyou");
    topTag.innerHTML = `
<div class="main">
    <canvas width="448px" height="504px"></canvas>
    <div class="right-side" width="50%" height="100%">
        <div class="title"></div>
        <div id="player" width="448px" height="504px"></div>
        <div id="explain" class="explain"></div>
    </div>
</div>
<div class="footer">
    <div id="counter" class="counter"></div>
    <div id="fps" class="fps"></div>
</div>
<input type="file" id="hiitemiyou-file" accept="application/json"/><br>
    `;
    // ファイルロードボタンの初期設定
    initializeFileButton();
    // ロードのキック
    console.log("location.href=" + location.href);
    // ローカルファイルの読み込み
    let dataText = document.getElementById("hiitemiyou-data").value;
    console.log("hiitemiyoau-dat=" + dataText);
    load(dataText);
}

function initializeFileButton() {
    console.log("on script");
    var inputFile = document.getElementById("hiitemiyou-file");
    var textarea = document.getElementById("hiitemiyou-data");
    inputFile.addEventListener("change", function(e) {
        console.log("on change");
        var reader = new FileReader();
        reader.readAsText(e.target.files[0]);
        //読み取り終了後、読み取ったjsonをtextareaに代入する。
        reader.onload = function() {
            textarea.value = reader.result;
            reload();
        }
    }, false);
}

// テキストエリアのJSONデータを再読み込みして画面に適用する
function reload() {
    // テキストエリアの内容を取得する
    let dataText = document.getElementById("hiitemiyou-data").value;
    console.log("hiitemiyoau-dat=" + dataText);
    // コード譜を読み込む
    load(dataText);
    // 動画IDを指定して動画をロードする
    player.cueVideoById({videoId: music.youtubeId});
}

// テキストエリアにjsonデータを取り込む
function readFile() {
    // テキストエリアの内容を取得する
    document.getElementById("hiitemiyou-data").value = "";
    // リロード
    reload();
}
function load(dataText) {
    // ロード時
    let musicData
    try {
        musicData = JSON.parse(dataText);
    } catch(e) {
        alert(e);
        console.log(e);
    }
    console.log(musicData);

    music = new Music();
    music.youtubeId = musicData.youtubeId;
    music.version = musicData.version;
    music.fall = musicData.fall;
    music.explain = musicData.explain;
    if(musicData.numOfString) {
        music.numOfString = musicData.numOfString;
    }

    for(let i = 0; i < musicData.chords.length; i++) {
        let chord = new Chord();
        chord.time = musicData.chords[i].time;
        chord.chordName = musicData.chords[i].chordName;
        chord.chord=musicData.chords[i].chord;
        chord.notes = makeNotes(chord.chord);
        let startTime = musicData.chords[i].time - music.fall;
        if(startTime < 0) {
            chord.startTime = 0;
        } else {
            chord.startTime = startTime;
        }
        if(i + 1 >= musicData.chords.length) {
            chord.endTime = 3600;
        } else {
            chord.endTime = musicData.chords[i + 1].time;
        }
        music.chords.push(chord);
    }
    console.log(music);

    function makeNotes(notesArray) {
        array = [];
        for(let i = 0; i < music.numOfString; i++) {
            let note = new Note();
            note.string = music.numOfString -  i;
            note.fret = notesArray[i];
            array.push(note);
        }
        return array;
    }

    // iframe Player APIを非同期で読み込み
    let tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    let firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

/**
 * player にiframeplayerを作成
 */ 
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: videoHeight,
        width: videoWidth,
        videoId: music.youtubeId,
        playerVars: {
        autoplay: 0  //自動再生する
        },
    });
}

/**
 * キャンバスの描画
 */
function drawCanvas() {
    frameCount += 1;

    if(isNull(music)) {
        return;
    }

    // 説明文の表示
    if(targetExplainFlag == false) {
        let targetExplain = document.getElementById("explain");
        targetExplain.innerHTML = music.explain;
    }

    let target = document.getElementById("counter");
    let second = 0
    if(player) {
        second = player.getCurrentTime();
    }
    target.innerHTML = Number.parseFloat(second).toFixed(3);

    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");

    // キャンバスのクリア
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, 448, 504);

    // タイミングが落ちる部分の描画
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.fillRect(0, CANVAS_HEIGHT - TIMING_BOTTOM_Y, TIMING_WIDTH, TIMING_BOTTOM_Y);

    // 落ちるコードの描画
    let droppingChords = music.droppingChord(second);
    for(var i = 0; i < droppingChords.length; i++) {
        let chord = droppingChords[i];
        // leftTopYがletにもvarにもできない
        leftTopY = FRET_MARGIN_Y + (504 - FRET_HEIGHT - FRET_MARGIN_Y * 2) * chord.getRate(second);
        // 指板、コード、コード名の表示
        drawFretBoardAndChord(ctx, leftTopY, chord);
        // 落ちるコードのタイミング
        ctx.fillStyle = "rgba(255, 255, 0, 1)";
        ctx.fillRect(0, leftTopY - TIMING_HEIGHT, TIMING_WIDTH, TIMING_HEIGHT);
    }

    // 落ちるコードを直前でフェードアウトさせる黒幕
    let grad  = ctx.createLinearGradient(TIMING_WIDTH, CANVAS_HEIGHT - FRET_HEIGHT * 3 / 2 - FRET_MARGIN_Y, TIMING_WIDTH, CANVAS_HEIGHT - FRET_HEIGHT - FRET_MARGIN_Y);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = grad;
    ctx.fillRect(15, CANVAS_HEIGHT - FRET_HEIGHT * 3 / 2 - FRET_MARGIN_Y, CANVAS_WIDTH - TIMING_WIDTH, FRET_HEIGHT * 3 / 2);

    // 落ちるコードを暗くして落ちたコードを目立たせる黒幕
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.lineWidth = 1;
    ctx.fillRect(15, CANVAS_HEIGHT - FRET_HEIGHT - FRET_MARGIN_Y, CANVAS_WIDTH - TIMING_WIDTH, FRET_HEIGHT + FRET_MARGIN_Y);

    // 落ちたコードの描画
    let droppedChords = music.droppedChord(second);
    for(var i = 0; i < droppedChords.length; i++) {
        let chord = droppedChords[i];
        // leftTopYがletにもvarにもできない
        leftTopY = FRET_MARGIN_Y + (CANVAS_HEIGHT - FRET_HEIGHT - FRET_MARGIN_Y * 2);
        // 指板、コード、コード名の表示
        drawFretBoardAndChord(ctx, leftTopY, chord);

        // 落ちたコードのタイミング
        ctx.fillStyle = "rgba(255, 255, 0," +  chord.getTimingAlpha(second) + ")";
        ctx.fillRect(
            0,
            leftTopY - 5 - (CANVAS_HEIGHT - FRET_HEIGHT - FRET_MARGIN_Y - TIMING_HEIGHT) * chord.getTimingLength(second),
            TIMING_WIDTH,
            TIMING_HEIGHT + (CANVAS_HEIGHT - FRET_HEIGHT - FRET_MARGIN_Y - - TIMING_HEIGHT) * chord.getTimingLength(second));
    }
}

/**
 * 指板、コード、コード名の表示
 * @param {*} ctx canvas
 * @param {*} leftTopY 描画するY座標
 * @param {*} chord コード
 */
function drawFretBoardAndChord(ctx, leftTopY, chord) {
    // 指板の描画
    drawFretBoard(ctx, leftTopY);
    // コードの描画
    for(let i = 0; i < chord.notes.length; i++) {
        let note = chord.notes[i];
        if(note.fret === "x") {
            drawMute(ctx, note);
        } else if(note.fret === "0") {
            // 何も描かない
        } else {
            drawNote(ctx, note);
        }
    }
    // コード名の描画
    chordName(ctx, leftTopY, chord.chordName);
}

/**
 * ミュート記号の描画
 * @param {*} ctx canvas
 * @param {*} note 音符
 */
function drawMute(ctx, note) {
    let noteX = FRET_LEFT_MARGIN_X - 2 - MUTE_WIDTH / 2;
    let noteY = leftTopY + (note.string - 1) * FRET_HEIGHT / (music.numOfString - 1);
    ctx.strokeStyle = "rgba(0, 255, 0, 1)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(noteX - MUTE_WIDTH / 2, noteY - MUTE_WIDTH / 2);
    ctx.lineTo(noteX + MUTE_WIDTH / 2, noteY + MUTE_WIDTH / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(noteX + MUTE_WIDTH / 2, noteY - MUTE_WIDTH / 2);
    ctx.lineTo(noteX - MUTE_WIDTH / 2, noteY + MUTE_WIDTH / 2);
    ctx.closePath();
    ctx.stroke();
}

/**
 * 音符の描画
 * @param {*} ctx canvas
 * @param {*} note 音符
 */
function drawNote(ctx, note) {
    ctx.fillStyle = "rgba(255, 255, 0, 1)";
    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
    ctx.lineWidth = 1;
    let fret = Number(note.fret);
    let noteX = (fretPosition(fret - 1) + fretPosition(fret)) /2 + FRET_LEFT_MARGIN_X;
    let noteY = leftTopY + (note.string - 1) * FRET_HEIGHT / (music.numOfString - 1);
    ctx.beginPath();
    ctx.arc(noteX, noteY, NOTE_RADIUS, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

/**
 * コード名の描画
 * @param {*} ctx canvas
 * @param {*} leftTopY 描画するY座標
 */
function chordName(ctx, leftTopY, chordName) {
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.strokeStyle = "rgba(0, 0, 0, 1)";
    ctx.font = "bold " + CHORD_NAME_HEIGHT + "px sans-serif";
    let text = ctx.measureText(chordName);
    let textX = CANVAS_WIDTH - text.width - FRET_MARGIN_Y;
    let textY = leftTopY + FRET_HEIGHT / 2 + CHORD_NAME_HEIGHT / 2;
    ctx.fillText(chordName, textX, textY);
    ctx.strokeText(chordName, textX, textY);
}

/**
 * フレットの描画
 * @param {*} ctx canvas
 * @param {*} leftTopY 描画するY座標
 */
function drawFretBoard(ctx, leftTopY) {
    // 外側を描く
    ctx.strokeStyle = "rgba(221, 221, 221, 1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(FRET_LEFT_MARGIN_X, leftTopY);
    ctx.lineTo(438, leftTopY);
    ctx.lineTo(438, leftTopY + FRET_HEIGHT);
    ctx.lineTo(FRET_LEFT_MARGIN_X, leftTopY + FRET_HEIGHT);
    ctx.lineTo(FRET_LEFT_MARGIN_X, leftTopY);
    ctx.closePath();
    ctx.stroke();

    // 2～4弦を描く
    for(let numOfString = 1; numOfString < music.numOfString - 1; numOfString++) {
        // (numOfString+1)弦を描く
        ctx.strokeStyle = "rgba(221, 221, 221, 1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(FRET_LEFT_MARGIN_X, leftTopY + FRET_HEIGHT / (music.numOfString - 1) * numOfString);
        ctx.lineTo(438, leftTopY + FRET_HEIGHT / (music.numOfString - 1) * numOfString);
        ctx.closePath();
        ctx.stroke();
    }

    // 1～22フレットを描く
    for(let numOfFret = 1; numOfFret < 24; numOfFret++) {
        // (numOfFret+1)フレットを描く
        ctx.strokeStyle = "rgba(221, 221, 221, 1)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(FRET_LEFT_MARGIN_X + fretPosition(numOfFret), leftTopY);
        ctx.lineTo(FRET_LEFT_MARGIN_X + fretPosition(numOfFret), leftTopY + FRET_HEIGHT);
        ctx.closePath();
        ctx.stroke();
    }

    // 3フレットポジションマーク
    drawPositionMark(ctx, 3);
    // 5フレットポジションマーク
    drawPositionMark(ctx, 5);
    // 7フレットポジションマーク
    drawPositionMark(ctx, 7);
    // 9フレットポジションマーク
    drawPositionMark(ctx, 9);
    // 12フレットポジションマーク
    drawPositionMark(ctx, 12);
    // 15フレットポジションマーク
    drawPositionMark(ctx, 15);
    // 17フレットポジションマーク
    drawPositionMark(ctx, 17);
    // 19フレットポジションマーク
    drawPositionMark(ctx, 19);
    // 21フレットポジションマーク
    drawPositionMark(ctx, 21);
    // 24フレットポジションマーク
    drawPositionMark(ctx, 24);
}

/**
 * ポジションマークを描画
 * @param {*} ctx canvas
 * @param {*} numOfFret フレット番号
 */
function drawPositionMark(ctx, numOfFret) {
    ctx.fillStyle = "rgba(128, 128, 128, 1)";
    ctx.lineWidth = 1;
    if(numOfFret === 12 || numOfFret === 24) {
        ctx.beginPath();
        ctx.arc(FRET_LEFT_MARGIN_X + (fretPosition(numOfFret - 1) + fretPosition(numOfFret)) / 2, leftTopY + FRET_HEIGHT * 3 / 10, 3, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(FRET_LEFT_MARGIN_X + (fretPosition(numOfFret - 1) + fretPosition(numOfFret)) / 2, leftTopY + FRET_HEIGHT * 7 / 10, 3, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.arc(FRET_LEFT_MARGIN_X + (fretPosition(numOfFret - 1) + fretPosition(numOfFret)) / 2, leftTopY + FRET_HEIGHT / 2, 3, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * 開放弦からフレットの長さを計算
 * @param {*} numOfFret フレット番号
 * @returns 開放弦からの長さ
 */
function fretPosition(numOfFret) {
    return (FRET_WIDTH * 4 / 3) - Math.pow(2 , ((12 - numOfFret) / 12)) * (FRET_WIDTH * 4 / 3) / 2;
}
/**
 * FPSの表示
 */
function drawFps() {
    let targetFps = document.getElementById("fps");
    targetFps.innerHTML = Number.parseFloat(frameCount / FRAME_PERIOD).toFixed(1) + " FPS";
    frameCount = 0;
}

/**
 * 定期的な表示の呼び出しと書き出し
 */
window.onload = function onLoad() {
    // 16ミリ秒（60FPSの1フレーム）ごとにdrawCanvasを実行
    let intervalID = setInterval(drawCanvas, 16);
    // 2000ミリ秒ごとにdrawFpsを実行してFPSを表示する
    let intervalID2 = setInterval(drawFps, FRAME_PERIOD * 1000);
    // 初期化
    initialize();
}
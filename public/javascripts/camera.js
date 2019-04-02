var g_isVideoSucsess= false;
/**
 * 情報表示エリア
 * @param {string} msg 
 */
function output(msg){
    let outputDiv = document.getElementById('output');
    outputDiv.innerHTML = msg;
}
document.getElementById("range_area_thre")
        .addEventListener('change',()=>{
    document.getElementById('div_range_area_thre').innerText = document.getElementById('range_area_thre').value
});
document.getElementById("range_max_area")
        .addEventListener('change',()=>{
    document.getElementById('div_range_max_area').innerText = document.getElementById('range_max_area').value
});
$(function(){
    let video = document.getElementById('_video');
   /**
    * 複数ブラウザに対応した、getUserMedia関数を得る
    */
    const getUserMediaMethod = () =>{
        return (navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia);
    };

    let userMedia = getUserMediaMethod();

    if (!userMedia){
        alert("Unsupported Browser");
    } else {
        window.URL = window.URL || window.webkitURL;
        navigator.getUserMedia = userMedia;
        navigator.getUserMedia(
            {
                video:true/*{
                    width:{min:320,ideal:320,max:1280},
                    height:{min:240,ideal:240,max:960},
                    facingMode:{exact:'environment'}
                }*/
            },
            function(stream){
                //video.src = window.URL.createObjectURL(stream);
                //Chromeは以下の書き方？createObjectURLはなくなった
                video.srcObject = stream;
                g_isVideoSucsess = true;
            },
            function(e){
                console.log("Error",e);
                alert("Error");
            }
        );
    }
});

$("#snap").click(()=>{
    if (g_isVideoSucsess){
        let canvas = document.getElementById('_canvas');
        let video = document.getElementById('_video');
        //let image = document.getElementById('_image');

        //let w = video.offsetWidth;
        //let h = video.offsetHeight;
        let w = video.clientWidth;
        let h = video.clientHeight;

        canvas.setAttribute('width',w);
        canvas.setAttribute('height',h);

        let context = canvas.getContext('2d');
        context.drawImage(video,0,0,w,h);

        //image.src = canvas.toDataURL('image/png');


    }
});

$("#ocr").click(()=>{
    let context = document.getElementById('_canvas').getContext('2d');
    let tJob = Tesseract.recognize(context,{lang:'jpn'});
    tJob.progress(msg => {
        //console.log(msg);
        // 進捗バーを作成
        let prog = Math.floor(msg.progress * 100);
        var buff = prog + "%:"
        let progC = Math.floor(prog/10);
        for (let i=0;i<10;i++) buff += (progC>i ? "■" : "□");

        output(msg.status + " " + buff);
    });
    tJob.then(ret => {
        console.log('result:',ret);
        output(ret.text);
    });
    tJob.catch(err => console.log('error:',err));
});

$("#exec").click(()=>{
    let canvas= document.getElementById('_canvas');
    let src = cv.imread(canvas);
    let dest = new cv.Mat();
    
    cv.cvtColor(src,dest,cv.COLOR_RGBA2GRAY,0);
    cv.adaptiveThreshold(dest,dest,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY_INV,7,8);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(dest,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_TC89_KCOS);
    let color = new cv.Scalar(0,0,255,255);

    //for (let i=0;i<contours.size();i++){
        cv.drawContours(src,contours,-1,color,1);
    //}

    cv.imshow(canvas,src);

    contours.delete();
    hierarchy.delete();
    src.delete();
    dest.delete();
});

$("#real_exec").click(()=>{
    let canvas = document.getElementById('_canvas');
    let video = document.getElementById('_video');

    let w = video.offsetWidth;
    let h = video.offsetHeight;
    //let dArea = document.getElementById("area_thre").text;
    //let dArea = document.getElementById("area_thre").text;

    canvas.setAttribute('width',w);
    canvas.setAttribute('height',h);
       
    let color = new cv.Scalar(0,0,255,255);
    let context = canvas.getContext('2d');
    var nowtime=new Date();
   
    /*
     timeupdateだと3～4FPSしか出ない。setIntervalだと約20FPS。ただこれはCPUが張り付くので
     timeupdateでいいと思う。
    */
    //setInterval(()=>{ //自前でタイマーすると制御面倒なので以下のtimeupdateイベント使った方がいいかも。
    video.addEventListener('timeupdate',()=>{
        context.drawImage(video,0,0,w,h);
        let src = cv.imread(canvas);
        let dest = new cv.Mat();
        let contours_threshold = document.getElementById('range_area_thre').value;
        let autonap_threshold = document.getElementById('range_max_area').value;
        
        //グレースケール変換
        cv.cvtColor(src,dest,cv.COLOR_RGBA2GRAY,0);
        //2値化
        cv.adaptiveThreshold(dest,dest,255,cv.ADAPTIVE_THRESH_GAUSSIAN_C,cv.THRESH_BINARY_INV,7,8);
        //領域検出
        let contours = new cv.MatVector();
        let hierarchy = new cv.Mat();
        cv.findContours(dest,contours,hierarchy,cv.RETR_EXTERNAL,cv.CHAIN_APPROX_TC89_KCOS);

        let maxarea = 0;
        //領域描画
        for (let i=0;i<contours.size();i++){
            //let approx = new cv.Mat();
            //cv.approxPolyDP(contours.get(i),approx,0.12 * cv.arcLength(contours.get(i),true),true);
            let area = cv.contourArea(contours.get(i),false);
            if (maxarea < area) maxarea = area;
            if (area > contours_threshold) cv.drawContours(src,contours,i,color,1,cv.LINE_4,hierarchy,1);
            //if (approx.rows === 4) cv.drawContours(src,contours,i,color,1,cv.LINE_4,hierarchy,1);
            
            //cv.drawContours(src,contours,-1,color,1,cv.LINE_4,hierarchy,1);
            //approx.delete();
        }

        cv.imshow(canvas,src);
        if (maxarea > autonap_threshold) video.pause();
        //後処理
        src.delete();
        dest.delete();
        contours.delete();
        hierarchy.delete();

        //FPS表示
        let fps = 1000 / ((new Date).getTime() - nowtime.getTime())
        output(Math.floor(fps)+ " FPS 最大面積:" + Math.floor(maxarea))
        nowtime = new Date();
    });
    //},20);
});
import { useRef, useState , useEffect } from 'react';
import axios from 'axios';
import Navbarr from './Navbar';
import Footer from './Footer';

const Upload = () => {

    const [files, setfiles] = useState([]);
    const [uploadfiles, uploadsetfiles] = useState([]);
    const [progress, setprogress] = useState(false);
    const [error, setError] = useState("");
    const [showmodal, setShowModal] = useState(false);
    const [documentData, setDocumentData] = useState([]);
    const [editData, setEditData] = useState([])
    const [tooltip, setToolTip] = useState({ show: false, text: '', x: 0, y: 0 });
    const [page, setPage] = useState(1);
    const itempage = 17
    const filesinput = useRef(null);
    const modalRef = useRef(null);
    const triggerRef = useRef(null);

    const lastitem = page * itempage;
    const firstitem = lastitem - itempage;
    const currentitem = documentData.slice(firstitem,lastitem)
    const tottalpage = Math.ceil(documentData.length/itempage) || 1;

    const fileinputclick = () => {
        filesinput.current.click();
    };
    useEffect(() => {
        const id = ['edit_modal','saveto_sheet','savesuccess']
        const onHide = () =>{
            if(document.activeElement instanceof HTMLElement){
                document.activeElement.blur();
            }
        }
        id.forEach((id) =>{
            const el = document.getElementById(id)
            el?.addEventListener('hide.bs.modal',onHide)
        })
        return () =>{
            id.forEach((id) =>{
                const el = document.getElementById(id)
                el?.removeEventListener('hide.bs.modal',onHide)
            })
        }
    },[])
    useEffect(() =>{
        if(showmodal){
            modalRef.current?.focus();
            document.body.classList.add("modal-open")
        }else{
            document.body.classList.remove("modal-open");
            triggerRef.current?.focus?.();
        }
        return () => document.body.classList.remove("modal-open");
    },[showmodal])

    useEffect(() =>{
        setPage(1);
    },[documentData.length])

    const previous = () =>{
        if(page > 1){
            setPage(prev => prev-1)
        }
    }
    const next = () =>{
        if(page < tottalpage){
            setPage(prev => prev+1)
        }
    }
    const mousehover = (e,text) =>{
        const cell = e.currentTarget;
        const overflow = cell.scrollWidth > cell.clientWidth || cell.scrollHeight > cell.clientHeight;

        if(overflow){
            const rect = cell.getBoundingClientRect();
            setToolTip({show: true,text:text,x: rect.left,y: rect.bottom})
        }
    }
    const mouseleave = () => {
        setToolTip({ show: false, text: '', x: 0, y: 0 });
    };
    const upload = (event) => {
        const selectfiles = event.target.files;
        if (!selectfiles) return;

        for (let i = 0; i < selectfiles.length; i++) {
            if (selectfiles[i].type !== 'application/pdf') {
                setError("กรุณาอัปโหลดไฟล์ PDF เท่านั้น");
                setShowModal(true);
                return;
            } else {
                setError("");
            }
        }
        setfiles(prevState => [
            ...prevState,
            ...Array.from(selectfiles).filter(file => !prevState.some(f => f.name === file.name)).map(file => ({
                name: file.name.length > 12
                    ? `${file.name.substring(0, 13)}....${file.name.split('.')[1]}`
                    : file.name,
                loading: 0,
            }))
        ]);

        setprogress(true);

        const formData = new FormData();
        Array.from(selectfiles).forEach(file => formData.append('files', file));

        axios.post(`http://localhost:8000/uploadfile/`, formData,)
            .then((response) => {
                const { document_data } = response.data;

                setDocumentData(prevData => [
                    ...prevData,
                    ...document_data.map(data => ({
                        ...data,
                        file_id: data.file_id || data.file_id
                    }))
                ]);

                uploadsetfiles(prevState => [
                    ...prevState,
                    ...Array.from(selectfiles).filter(file => !prevState.some(f => f.name === file.name)).map(file => ({
                        name: file.name.length > 12
                            ? `${file.name.substring(0, 13)}....${file.name.split('.')[1]}`
                            : file.name,
                        file_id: file.name
                    }))
                ]);

                setfiles([]);
                setprogress(false);
            })
            .catch((error) => {
                console.error(error);
                setError("ไม่สามารถสกัดข้อมูลจากไฟล์ PDF ได้");
                setShowModal(true);
                setprogress(false);

                const updatedFiles = Array.from(selectfiles).filter(file => file.name !== event.target.files[0].name);
                setfiles(prevState => prevState.filter(file => !updatedFiles.includes(file)));
            });
    };

    const deletefile = (fileName, fileId) => {
        const updatedUploadFiles = uploadfiles.filter(file => file.file_id !== fileId);
        uploadsetfiles(updatedUploadFiles);

        const updatedDocumentData = documentData.filter(doc => doc.file_id !== fileId);
        setDocumentData(updatedDocumentData);
    };

    const edit_extractdata = (data) =>{
        setEditData(data);
        const modaledit = new window.bootstrap.Modal(document.getElementById('edit_modal')) 
        modaledit.show();
    }
    const save_editextractdata = () =>{
        const updateddata = [...documentData]
        const index = updateddata.findIndex(item => item.file_id === editData.file_id)
        if(index !== -1){
            updateddata[index] = editData;
            setDocumentData(updateddata)
        }

        const modaledit = window.bootstrap.Modal.getInstance(document.getElementById('edit_modal'))
        modaledit.hide()
    }

    const save_tosheetdrive = async () =>{
        if (!documentData || documentData.length === 0) {
            setError('ไม่พบข้อมูลที่ต้องการบันทึก');
            const modalConfirm = window.bootstrap.Modal.getInstance(document.getElementById('saveto_sheet'));
            modalConfirm.hide();
            setShowModal(true);
            return;
        }

        const { access_token } = JSON.parse(localStorage.getItem('googleUser'));
        try{
            const response = await axios.post(`http://localhost:8000/saveto_sheetanddrive/`,documentData,{
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            })
            console.log(response.data); 
            if (response.data.message) {

                setError(response.data.message);
                const modalConfirm = window.bootstrap.Modal.getInstance(document.getElementById('saveto_sheet'));
                modalConfirm.hide();

                setTimeout(()=>{
                    const modalSuccess = new window.bootstrap.Modal(document.getElementById('savesuccess'));
                    modalSuccess.show();
                },200);

                setDocumentData([])
                uploadsetfiles([])
            } else {
                setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
                setShowModal(true);
            }
        }catch (e) {
            const modalConfirm = window.bootstrap.Modal.getInstance(document.getElementById('saveto_sheet'));
            modalConfirm.hide();
            console.error("Error details:", e.response.data);
            setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
            setShowModal(true);
        }
    }
    return (
        <>
            <div className='d-flex flex-column min-vh-100'>
                <Navbarr />
                <div className='container-fluid flex-grow-1 py-4 d-flex flex-column'>
                    <div className='row flex-grow-1 h-100 g-4 mx-3'>
                        <div className='col-lg-3 col-md-4 d-flex flex-column'>
                            {/* upload file */}
                            <div className="upload-box flex-grow-1 d-flex flex-column border border-black">
                                <p>อัปโหลดไฟล์ของคุณ</p>
                                <form>
                                    <input className="file-input" type='file' name="file" hidden ref={filesinput} onChange={upload} multiple />
                                    <div className="icon-upload" onClick={fileinputclick}>
                                        <i className="fa-solid fa-cloud-arrow-up"></i>
                                    </div>
                                    <p className='m-0'>เรียกดูไฟล์ที่จะอัปโหลด</p>
                                </form>
                                {progress && (
                                    <section className='loading-area'>
                                        {files.map((file, index) => (
                                            <div className='rows' key={index}>
                                                <i className="fa-solid fa-file-pdf"></i>
                                                <div className="content">
                                                    <div className="details">
                                                        <span className="name">{`${file.name} - uploading`}</span>
                                                        <span className="percent">{`${file.loading}`}</span>
                                                        <div className="loading-bar">
                                                            <div className="loading" style={{ width: `${file.loading}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </section>
                                )}
                                <section className='upload-area'>
                                    {uploadfiles.map((file, index) => (
                                        <div className='rows' key={index}>
                                            <div className="content upload">
                                                <div className="details">
                                                    <i className="fa-solid fa-file-pdf"></i>
                                                    <span className='ms-3 name'>{file.name}</span>
                                                    <i className="ms-3 fa-solid fa-check"></i>
                                                </div>
                                                <div>
                                                    <button onClick={() => deletefile(file.name, file.file_id)} className="btn btn-danger btn-sm">
                                                        <i className="fa-solid fa-xmark"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            </div>
                        </div>

                        {/* upload show input */}
                        <div className='col-lg-9 col-md-8 d-flex flex-column justify-content-between'>
                            <div className='show-upload-input'>
                                <div>
                                    <table className="table table-bordered table-sm" style={{ tableLayout: "fixed", width: "100%" }}>
                                        <thead>
                                            <tr>
                                                <th className='col-title'>ชื่อหัวข้อ TH, ENG</th>
                                                <th className='col-author'>ชื่อผู้จัดทำ</th>
                                                <th className='col-advisor'>ชื่อ อ. ที่ปรึกษา</th>
                                                <th className='col-year'>ปีการศึกษา</th>
                                                <th className='col-keywords'>คำสำคัญ</th>
                                                <th className="text-center col-action">ดำเนินการ</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentitem && currentitem.length > 0 ? (
                                                currentitem.map((data, index) => (
                                                    <tr key={index}>
                                                        <td className='extract-data' onMouseEnter={(e) => mousehover(e,data.title_head)} onMouseLeave={mouseleave}>{data.title_head}</td>
                                                        <td className='extract-data' onMouseEnter={(e) => mousehover(e,data.authors)} onMouseLeave={mouseleave}>{data.authors}</td>
                                                        <td className='extract-data' onMouseEnter={(e) => mousehover(e,data.advisor)} onMouseLeave={mouseleave}>{data.advisor}</td>
                                                        <td className='extract-data' onMouseEnter={(e) => mousehover(e,data.year)} onMouseLeave={mouseleave}>{data.year}</td>
                                                        <td className='extract-data' onMouseEnter={(e) => mousehover(e,data.keywords)} onMouseLeave={mouseleave}>{data.keywords}</td>
                                                        <td className='text-center'>
                                                            <button className="btn btn-warning btn-sm" onClick={()=> edit_extractdata(data)}>แก้ไข</button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : null}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className='d-flex justify-content-between align-items-center gap-2'>
                                <div className='d-flex justify-content-center align-items-center'>
                                    <button className="btn btn-dark btn-sm" onClick={previous} disabled={page === 1}><i className="fa-solid fa-backward"></i></button>
                                    <span className="mx-2">{page} / {tottalpage}</span>
                                    <button className="btn btn-dark btn-sm" onClick={next} disabled={page === tottalpage}><i className="fa-solid fa-forward"></i></button>
                                </div>
                                <button className='btn-saveto-sheet' data-bs-toggle="modal" data-bs-target="#saveto_sheet">บันทึก</button>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
            {/* tooltip */}
            {tooltip.show && (
                <div className='hover-tooltip' style={{left:`${tooltip.x}px`,top:`${tooltip.y}px`}}>
                    {tooltip.text}
                </div>
            )}
            {/* modal Notification upload */}
            {showmodal && (
                <div className="modal show" tabIndex="-1" aria-labelledby="notificationuploadLabel" style={{ display: 'block' }} aria-modal="true" ref={modalRef}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title text-danger" id="notificationuploadLabel"><i className="fa-solid fa-bell me-2"></i>แจ้งเตือน</h5>
                                <button type="button" className="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Close" onClick={(e) => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className='m-0'>{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* modal edit extractdata*/}
            <div className="modal fade" id="edit_modal" tabIndex="-1" aria-labelledby="editModalLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0">
                <div className="modal-header">
                    <h5 className="modal-title">แก้ไขข้อมูลโครงงาน</h5>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="mb-2">
                      <label>ชื่อหัวข้อ TH,ENG</label>
                      <input className="modal-formedit" value={editData.title_head || ""} onChange={e => setEditData(prev => ({ ...prev, title_head: e.target.value}))}/>
                    </div>
                    <div className="mb-2">
                      <label>ชื่อผู้จัดทำ</label>
                      <input className="modal-formedit" value={editData.authors || ""} onChange={e => setEditData(prev => ({ ...prev, authors: e.target.value}))}/>
                    </div>
                    <div className="mb-2">
                      <label>ชื่อ อ. ที่ปรึกษา</label>
                      <input className="modal-formedit" value={editData.advisor || ""} onChange={e => setEditData(prev => ({ ...prev, advisor: e.target.value}))}/>
                    </div>
                    <div className="mb-2">
                      <label>ปีการศึกษา</label>
                      <input className="modal-formedit" value={editData.year || ""} onChange={e => setEditData(prev => ({ ...prev, year: e.target.value}))}/>
                    </div>
                    <div className="mb-2">
                      <label>คำสำคัญ</label>
                      <input className="modal-formedit" value={editData.keywords || ""} onChange={e => setEditData(prev => ({ ...prev, keywords: e.target.value}))}/>
                    </div>
                  </form>
                  <div className="d-flex justify-content-end mt-2">
                    <button type="button" className="btn btn-warning me-2" onClick={save_editextractdata}>แก้ไข</button>
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* modal confirmsave to sheet */}
          <div className="modal fade" id="saveto_sheet" tabIndex="-1" aria-labelledby="savetosheetLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0">
                <div className="modal-header">
                    <h5 className="modal-title">บันทึกข้อมูล</h5>
                </div>
                <div className="modal-body">
                     <p className="m-0">คุณต้องการที่จะบันทึกข้อมูลลง Sheet และ drive หรือไม่?</p>
                     <div className="d-flex justify-content-end mt-2">
                        <button type="button" className="btn btn-primary me-2" onClick={save_tosheetdrive}>ยืนยัน</button>
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                    </div>
                </div>
              </div>
            </div>
          </div>
          {/* modal success */}
          <div className="modal fade" id="savesuccess" tabIndex="-1" aria-labelledby="savesuccessLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0">
                <div className="modal-body text-center">
                  <div className="d-flex justify-content-end">
                    <button type="button" className="shadow-none btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <i className="fa-solid fa-circle-check fs-1" style={{color:'#21a833'}}></i>
                  <div className="mt-2">{error}</div>
                </div>
              </div>
            </div>
          </div>
        </>
    );
};

export default Upload;

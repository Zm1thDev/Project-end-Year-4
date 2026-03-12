import { useState,useEffect } from "react"
import Footer from "./Footer"
import Navbarr from "./Navbar"


const Adminpage = ()=> {
    const [sheetData, setSheetData] = useState([]);
    const [sheetUrl, setSheetUrl] = useState("");
    const [error, setError] = useState("");
    const [totalUser,setTotalUser] = useState(0);
    const [totalTeachers, setTotalTeachers] = useState(0);
    const [totalStudents, setTotalStudents] = useState(0);
    const [editRow, setEditRow] = useState(null);
    const [editData, setEditData] = useState(["","","","",""])
    const [deleteindex,setDeleteIndex] = useState(null)
    const [page, setPage] = useState(1)
    const itempage = 16

    const lastitem = page * itempage;
    const firstitem = lastitem - itempage;
    const currentitem = sheetData.slice(firstitem,lastitem)
    const tottalpage = Math.ceil(sheetData.length/itempage) || 1;

    useEffect(() => {
    const storedData = localStorage.getItem("sheetData");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setSheetData(parsedData);
        setTotalUser(parsedData.length);
        setTotalTeachers(parsedData.filter(row => row[3] === "อาจารย์").length);
        setTotalStudents(parsedData.filter(row => row[3] === "นักศึกษา").length);
      }
    }, []);
    useEffect(()=>{
      fetch(`http://localhost:8000/get-userfromsheet/`)
      .then(res => res.json())
      .then(data => {
        if(data.url){
          setSheetUrl(data.url)
        }
      }).catch((err) => setError("เกิดข้อผิดพลาดในการดึง URL Useraccount"));
    },[])
    useEffect(() =>{
      const id = ['import_confirm','import_success','edit_modal','delete_modal']
      const onHide = () =>{
        if(document.activeElement instanceof HTMLElement){
          document.activeElement.blur()
        }
      }
      id.forEach(id => {
        const el = document.getElementById(id)
        el?.addEventListener('hide.bs.modal', onHide)
      })
      return () =>{
        id.forEach(id => {
          const el = document.getElementById(id);
          el?.removeEventListener('hide.bs.modal', onHide);
        });
      }
    },[])
    useEffect(() =>{
        setPage(1);
    },[sheetData.length])

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
    const getdatasheet = async () => {
      setError("")
      const regex = /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9-_]+/;
      if(!regex.test(sheetUrl)){
          setError("URL ไม่ถูกต้อง หรือ ไม่พบ URL ");
          return;
        }
      try{
        const response = await fetch(`http://localhost:8000/get-sheetdata/`);
        const data = await response.json();

        if(data.data && data.data.length > 0){
          const dataRows = data.data;
          setSheetData(dataRows);

          setTotalUser(dataRows.length);
          setTotalTeachers(dataRows.filter(row => row[3] === "อาจารย์").length);
          setTotalStudents(dataRows.filter(row => row[3] === "นักศึกษา").length);

          localStorage.setItem("sheetData", JSON.stringify(dataRows));
          const modalConfirm = window.bootstrap.Modal.getInstance(document.getElementById('import_confirm'));
          modalConfirm.hide();

          setTimeout(()=>{
            const modalSuccess = new window.bootstrap.Modal(document.getElementById('import_success'));
            modalSuccess.show();
          },200);
        }else{
          setError("ไม่พบข้อมูลใน Sheet");
        }
      }catch (e) {
        setError("เกิดข้อผิดพลาดในการดึงข้อมูลจาก API");
      }
    }
    const editdata_modal = (row,i) => {
      setEditRow(i);
      setEditData(row);

      setTimeout(()=>{
        const modalEdit = new window.bootstrap.Modal(document.getElementById('edit_modal'))
        modalEdit.show();
      },100);
    }
    const deletedata_modal = (index) =>{
      setDeleteIndex(index)

      const modal = new window.bootstrap.Modal(document.getElementById('delete_modal'))
      modal.show();
    }
    const save_editdata = async () =>{
      try {
        const res = await fetch(`http://localhost:8000/update-row/`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                index: editRow,
                row: editData
            })
        });
        if(res.ok){
            let newSheet = [...sheetData];
            newSheet[editRow] = editData;
            setSheetData(newSheet);
            localStorage.setItem("sheetData", JSON.stringify(newSheet));
            const modalEdit = window.bootstrap.Modal.getInstance(document.getElementById('edit_modal'));
            modalEdit.hide();
        }else{
          const errorData = await res.json();
            alert(`เกิดข้อผิดพลาดขณะบันทึก: ${errorData.detail || "ไม่ทราบข้อผิดพลาด"}`);
        }
      } catch (e) {
        alert("เกิดข้อผิดพลาดขณะบันทึก");
      }
    }

    const deletedata_row = async () =>{
      if(deleteindex !== null){
        try{
          const response = await fetch(`http://localhost:8000/delete-row/`,{
            method:"DELETE",
            headers:{
              "Content-Type": "application/json",
            },
            body:JSON.stringify({index: parseInt(deleteindex) }),
        })
        if(response.ok){
          const modal = window.bootstrap.Modal.getInstance(document.getElementById('delete_modal'))
          modal.hide();
          
          const new_data = sheetData.filter((_, i) => i !== deleteindex);
          setSheetData(new_data)
          setDeleteIndex(null);
          localStorage.setItem("sheetData", JSON.stringify(new_data));
          const refreshResponse = await fetch(`http://localhost:8000/get-sheetdata/`);
          const data = await refreshResponse.json();
          setSheetData(data.data);

          setTotalUser(data.data.length)
          setTotalTeachers(data.data.filter(row => row[3] === "อาจารย์").length)
          setTotalStudents(data.data.filter(row => row[3] === "นักศึกษา").length)
        }else{
          const errordata = await response.json()
          alert(`เกิดข้อผิดพลาดขณะลบข้อมูล: ${errordata.detail || "ไม่ทราบข้อผิดพลาด"}`);
        }
        }catch(e){
          alert("เกิดข้อผิดผลาดขณะลบข้อมูล")
        }
      }
    }
    return(
        <>
        <div className="min-vh-100 d-flex flex-column">
            <Navbarr />
            <div className="container-fluid py-4 flex-fill">
                <div className="row h-100 mx-4">
                   <div className="col-12 col-lg-3 d-flex flex-column mb-4">
                      <div className="card-dash d-flex justify-content-between align-items-center px-4 total-user rounded mb-3">
                        <div className="show-dash"> 
                          <i className="fa-solid fa-users"></i>
                          <p className="m-0">จำนวนบัญชีผู้ใช้งาน</p>
                        </div>
                        <div className="d-flex">
                          <p className="m-0 num-amount">{totalUser}</p>
                          <p className="w-amount">บัญชี</p>
                        </div>
                      </div>
                      <div className="card-dash d-flex justify-content-between align-items-center px-4 type-teacher rounded mb-3">
                        <div className="show-dash">
                            <i className="fa-solid fa-user-tie"></i>
                            <p className="m-0">อาจารย์</p>
                        </div>
                        <div className="d-flex">
                          <p className="m-0 num-amount">{totalTeachers}</p>
                          <p className="w-amount">บัญชี</p>
                        </div>
                      </div>
                      <div className="card-dash d-flex justify-content-between align-items-center px-4 type-student rounded">
                        <div className="show-dash">
                            <i className="fa-solid fa-user"></i>
                            <p className="m-0">นักศึกษา</p>
                        </div>
                        <div className="d-flex">
                          <p className="m-0 num-amount">{totalStudents}</p>
                          <p className="w-amount">บัญชี</p>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-lg-9 d-flex flex-column">
                        {/* import data */}
                        <div className="d-flex align-items-center justify-content-start">
                          <button className="btn-input-sheet" data-bs-toggle="modal" data-bs-target="#import_confirm">นำเข้าข้อมูล</button>
                        </div>
                        <div className="show-data-user mt-4">
                          <div>
                            <table className="table table-bordered table-sm">
                              <thead>
                                <tr>
                                  <th className="col-stdid ">รหัส</th>
                                  <th className="col-namelast">ชื่อ-นามสกุล</th>
                                  <th className="col-email">อีเมล</th>
                                  <th className="col-type">ประเภท</th>
                                  <th className="col-branch">สาขา</th>
                                  <th className="text-center col-action">ดำเนินการ</th>
                                </tr>
                              </thead>
                              <tbody>
                                {currentitem.length > 0 ? (
                                  currentitem.map((row,i) => (
                                    <tr key={i}>
                                    <td>{row[0]}</td>
                                    <td>{row[1]}</td>
                                    <td>{row[2]}</td>
                                    <td>{row[3]}</td>
                                    <td>{row[4]}</td>
                                    <td className="text-center">
                                      <button className="btn btn-warning btn-sm me-2" onClick={()=> editdata_modal(row,i)}>แก้ไข</button>
                                      <button className="btn btn-danger btn-sm" onClick={()=> deletedata_modal(i)}>ยกเลิก</button>
                                    </td>
                                  </tr>
                                  ))
                                ) : null}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="mt-4 d-flex justify-content-center align-items-center gap-2">
                          <button className="btn btn-dark btn-sm" onClick={previous} disabled={page === 1}><i className="fa-solid fa-backward"></i></button>
                          <span className="mx-2">{page} / {tottalpage}</span>
                          <button className="btn btn-dark btn-sm" onClick={next} disabled={page === tottalpage}><i className="fa-solid fa-forward"></i></button>
                      </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
        {/* Modal Confirm */}
        <div className="modal fade" id="import_confirm" tabIndex="-1" aria-labelledby="importconfirmLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0">
                  <div className="modal-header">
                    <h5 className="modal-title">นำเข้าข้อมูลบัญชีผู้ใช้งาน</h5>
                  </div>
                  <div className="modal-body">
                    <p className="m-0">คุณต้องการที่จะนำเข้าข้อมูลบัญชีผู้ใช้งานใช่หรือไม่?</p>
                    <span style={{fontSize:'15px'}} className="text-danger">{error}</span>
                    <div className="d-flex justify-content-end mt-2">
                        <button type="button" className="btn btn-primary me-2"  onClick={getdatasheet}>ยืนยัน</button>
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={()=> setError("")}>ยกเลิก</button>
                    </div>
                  </div>
                </div>
            </div>
        </div>
        {/* Modal Success */}
          <div className="modal fade" id="import_success" tabIndex="-1" aria-labelledby="importSuccessLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0">
                <div className="modal-body text-center">
                  <div className="d-flex justify-content-end">
                    <button type="button" className="shadow-none btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                  </div>
                  <i className="fa-solid fa-circle-check fs-1" style={{color:'#21a833'}}></i>
                  <div className="mt-2">นำเข้าข้อมูลบัญชีผู้ใช้งานสำเร็จ</div>
                </div>
              </div>
            </div>
          </div>
          {/* modal Edit row */}
          <div className="modal fade" id="edit_modal" tabIndex="-1" aria-labelledby="editModalLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0">
                <div className="modal-header">
                    <h5 className="modal-title">แก้ไขข้อมูลบัญชีผู้ใช้งาน</h5>
                </div>
                <div className="modal-body">
                  <form>
                    <div className="mb-2">
                      <label>รหัส</label>
                      <input className="modal-formedit" value={editData[0] || ""} onChange={e => setEditData(prev=>[e.target.value, prev[1], prev[2], prev[3], prev[4]])} />
                    </div>
                    <div className="mb-2">
                      <label>ชื่อ-นามสกุล</label>
                      <input className="modal-formedit" value={editData[1] || ""} onChange={e => setEditData(prev=>[prev[0], e.target.value, prev[2], prev[3], prev[4]])} />
                    </div>
                    <div className="mb-2">
                      <label>อีเมล</label>
                      <input className="modal-formedit" value={editData[2] || ""} onChange={e => setEditData(prev=>[prev[0], prev[1], e.target.value, prev[3], prev[4]])} />
                    </div>
                    <div className="mb-2">
                      <label>ประเภท</label>
                      <input className="modal-formedit" value={editData[3] || ""} onChange={e => setEditData(prev=>[prev[0], prev[1], prev[2], e.target.value, prev[4]])} />
                    </div>
                    <div className="mb-2">
                      <label>สาขา</label>
                      <input className="modal-formedit" value={editData[4] || ""} onChange={e => setEditData(prev=>[prev[0], prev[1], prev[2], prev[3], e.target.value])} />
                    </div>
                  </form>
                  <div className="d-flex justify-content-end mt-2">
                    <button type="button" className="btn btn-warning me-2" onClick={save_editdata}>แก้ไข</button>
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* modal delete row */}
          <div className="modal fade" id="delete_modal" tabIndex="-1" aria-labelledby="deletemodlaLabel" aria-hidden="true" data-bs-focus="false">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0">
                <div className="modal-header">
                    <h5 className="modal-title">ยกเลิกบัญชีผู้ใช้งาน</h5>
                </div>
                <div className="modal-body">
                  <p className="m-0">คุณต้องการยกเลิกข้อมูลบัญชีผู้ใช้งานนี้ใช่หรือไม่?</p>
                  <div className="d-flex justify-content-end mt-2">
                    <button type="button" className="btn btn-danger me-2" onClick={deletedata_row}>ยืนยัน</button>
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">ยกเลิก</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
    )
}

export default Adminpage
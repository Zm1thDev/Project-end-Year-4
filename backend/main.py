from pathlib import Path
from google.oauth2 import service_account
from fastapi import FastAPI, UploadFile, File, Header, HTTPException, Body, Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from fastapi.responses import FileResponse
from googleapiclient.http import MediaFileUpload
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse
import tempfile
import PyPDF2
import os
import re
import requests

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Txt_path = './url.txt'
service_account_file = 'service-account-file.json'

@app.get("/")
async def root():
    return "ยินดีต้อนรับสู่ FastAPI"

# get service account
def get_google_sheets_service():
    creds = service_account.Credentials.from_service_account_file(
        service_account_file,
        scopes=['https://www.googleapis.com/auth/spreadsheets'],
    )
    service = build('sheets', 'v4', credentials=creds)
    return service

# get url and folderid from txtfile
def get_url_folderid_fromtxtfile():
    try:
        extracted_data_url = None
        storage_file_id = None
        if not os.path.exists(Txt_path):
            raise HTTPException(status_code=404, detail="ไม่พบ File txt")
        
        with open(Txt_path, "r") as file:
            lines = file.readlines()
            for line in lines:
                if line.strip().startswith("extracteddata="):
                    extracted_data_url = line.split('=', 1)[1].strip()
                if line.strip().startswith("storagefile="):
                    storage_file_id = line.split('=', 1)[1].strip()
        
        if not extracted_data_url or not storage_file_id:
            raise HTTPException(status_code=400, detail="URL หรือ Folder ID ไม่พบในไฟล์ txt")

        if not re.match(r"https://docs\.google\.com/spreadsheets/d/[a-zA-Z0-9-_]+", extracted_data_url):
            raise HTTPException(status_code=400, detail="URL ของ Sheets ไม่ถูกต้อง")

        return extracted_data_url, storage_file_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการโหลดข้อมูลจากไฟล์ txt: {str(e)}")

# api google_auth
@app.post("/auth/")
async def google_auth(request: Request):
    try:
        body = await request.json()
        access_token = body.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="ไม่มี access_token")
            
        user_info_res = requests.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if user_info_res.status_code != 200:
            raise HTTPException(status_code=user_info_res.status_code, detail=user_info_res.text)

        profile = user_info_res.json()

        return {
            "profile": profile,
            "access_token": access_token
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"การตรวจสอบสิทธิ์ล้มเหลว: {str(e)}")

# api get url useraccount
@app.get("/get-userfromsheet/")
async def get_userfromsheet():
    if not os.path.exists(Txt_path):
        raise HTTPException(status_code=404, detail="ไม่พบ File txt")
    with open(Txt_path, "r") as file:
        for line in file:
            if line.strip().startswith("useraccount="): 
                url = line.split('=', 1)[1].strip()
                if not re.match(r"https://docs\.google\.com/spreadsheets/d/[a-zA-Z0-9-_]+", url):
                    raise HTTPException(status_code=400, detail="URL ในไฟล์ไม่ถูกต้อง")
                return {"url": url}
    raise HTTPException(status_code=404, detail="ไม่พบ URL ใน File") 

# api get data from sheet
@app.get("/get-sheetdata/")
async def get_sheet_data():
    try:
        url = await get_userfromsheet()
        sheet_url = url.get("url")

        match = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
        sheet_id = match.group(1) if match else None
        if not sheet_id:
            raise HTTPException(status_code=400, detail="URL ไม่ถูกต้อง")

        service = get_google_sheets_service()
        sheet = service.spreadsheets()

        result = sheet.values().get(spreadsheetId=sheet_id, range="ชีต1!A2:Z").execute()
        values = result.get('values', [])

        if not values:
            raise HTTPException(status_code=404, detail="ไม่มีข้อมูลใน sheet")
        
        emails = set()
        unique_values = []
        for row in values:
            email = row[2]
            if email not in emails:
                emails.add(email)
                unique_values.append(row)

        return JSONResponse(content={"data": unique_values})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# api get data from sheet by emailuser
@app.get("/get-userdata/{email}")
async def getuser_data_email(email: str):
    try:
        url = await get_userfromsheet()
        sheet_url = url.get("url")

        match = re.search(r"/d/([a-zA-Z0-9-_]+)",sheet_url)
        sheet_id = match.group(1) if match else None
        if not sheet_id:
            raise HTTPException(status_code=400, detail="URL ไม่ถูกต้อง")
        
        service = get_google_sheets_service()
        sheet = service.spreadsheets()

        result = sheet.values().get(spreadsheetId=sheet_id,range="ชีต1!A2:Z").execute()
        values = result.get('values',[])

        if not values:
            raise HTTPException(status_code=404, detail="ไม่มีข้อมูลใน sheet")

        user_data = next((row for row in values if row[2] == email),None)
        if user_data :
            return{"user": user_data}
        else:
            raise HTTPException(status_code=404,detail="ไม่พบข้อมูลผู้ใช้ที่ตรงกับอีเมล")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# api update row sheet
@app.put("/update-row/")
async def update_row(
    index: int = Body(...), 
    row: list = Body(...)
):
    try:
        url = await get_userfromsheet()
        sheet_url = url.get("url")
        match = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
        sheet_id = match.group(1) if match else None
        if not sheet_id:
            raise HTTPException(status_code=400, detail="URL ไม่ถูกต้อง")

        service = get_google_sheets_service()
        sheet = service.spreadsheets()
        sheet_range = f'ชีต1!A{index+2}:E{index+2}'
        result = sheet.values().update(
            spreadsheetId=sheet_id,
            range=sheet_range,
            valueInputOption="RAW",
            body={"values": [row]}
        ).execute()
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# api delete row sheet
class DeleteRequest(BaseModel):
    index: int
@app.delete("/delete-row/")
async def delete_row(request: DeleteRequest):
    index = request.index
    try:
        url = await get_userfromsheet()
        sheet_url = url.get("url")

        match = re.search(r"/d/([a-zA-Z0-9-_]+)", sheet_url)
        sheet_id = match.group(1) if match else None
        if not sheet_id:
            raise HTTPException(status_code=400, detail="URL ไม่ถูกต้อง")

        service = get_google_sheets_service()
        sheet = service.spreadsheets()

        result = sheet.values().get(spreadsheetId=sheet_id, range="ชีต1!A2:Z").execute()
        values = result.get('values', [])
        if len(values) > index:
            values.pop(index)

            sheet.values().clear(
                spreadsheetId=sheet_id,
                range="ชีต1!A2:Z1000"
            ).execute()

            sheet.values().update(
                spreadsheetId=sheet_id,
                range="ชีต1!A2",
                valueInputOption="RAW",
                body={"values": values}
            ).execute()
        return {"status": "success", "message": f"แถว {index+1} ถูกลบเรียบร้อย"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# api upload file UI
@app.post("/uploadfile/")
async def upload_file(files: list[UploadFile] = File(...)):
    doucment_data_list = [] 

    for file in files:
        fd, temp_path = tempfile.mkstemp()
        try:
            with os.fdopen(fd, 'wb') as tmp:
                tmp.write(await file.read())

            with open(temp_path, "rb") as pdf_file:
                reader = PyPDF2.PdfReader(pdf_file)
                
                page_1 = reader.pages[0]
                text_1 = page_1.extract_text()
                page_2 = reader.pages[3]
                text_2 = page_2.extract_text()
                page_3 = reader.pages[4]
                text_3 = page_3.extract_text()

                match_1 = re.search(r'^\s*(.*?)(?=^\s*$)', text_1,  re.DOTALL | re.MULTILINE)
                match_2 = re.search(r'([^\n]+(?:\n[^\n]+))\s*$', text_2)
                match_3A = re.search(r'อาจารย์ที่ปรึกษา\s*(.*)', text_3)
                match_3B = re.search(r'อาจารย์ที่ปรึกษาร่วม\s*(.*)', text_3)
                match_4 = re.search(r'ปีการศึกษา\s*(.*)', text_3)
                match_5 = re.search(r'คำสำคัญ\s*(.*(?:\n.*)?)', text_3)
                
                if match_1:
                    lines = match_1.group(1).strip().split("\n")
                    title_head = "\n".join([
                        re.sub(r'\s+', ' ', line.strip()) 
                        for line in lines if line.strip()
                    ])
                else:
                    title_head = "ไม่พบข้อมูล"

                authors = re.sub(r'\s+', ' ', match_2.group(1).strip()) if match_2 else "ไม่พบข้อมูล"

                advisor_list = []
                if match_3A:
                    advisor_list.append(match_3A.group(1).strip())
                if match_3B:
                    advisor_list.append(f"{match_3B.group(1).strip()} (ที่ปรึกษาร่วม)")
                advisor = " ".join(advisor_list) if advisor_list else "ไม่พบข้อมูล"

                year = match_4.group(1).strip() if match_4 else "ไม่พบข้อมูล"

                keywords = re.sub(r'\s+', ' ', match_5.group(1).strip()) if match_5 else "ไม่พบข้อมูล"
                document_data = {
                    "file_id": file.filename,
                    "title_head": title_head,
                    "authors": authors,
                    "advisor": advisor,
                    "year": year,
                    "keywords": keywords,
                    "file_path": temp_path
                }

                doucment_data_list.append(document_data)
        
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise HTTPException(400, detail=f"ไม่สามารถสกัดข้อมูลจากไฟล์ {file.filename}: {str(e)}")

    return {"document_data": doucment_data_list} 

# save file to google drive
def save_file_to_drive(file_path, folder_id, filename,drive_service):

    media = MediaFileUpload(file_path, mimetype="application/pdf", resumable=False)
    request_body = {
        "name": filename,
        "parents": [folder_id]
    }
    created_file = drive_service.files().create(
        body=request_body,
        media_body=media,
        fields="id, webViewLink"
    ).execute()
    drive_service.permissions().create(
        fileId=created_file['id'],
        body={'role': 'reader', 'type': 'anyone'}
    ).execute()

    return created_file['id'], created_file['webViewLink']

# save  extracteddata to google sheet
def save_extracteddata_to_sheet(sheet_url, document_data,sheets_service):
    sheet_id = sheet_url.split("/d/")[1].split("/")[0]
    sheet_range = "ชีต1!A2:F1000"

    values = []
    for document in document_data:
        values.append([
            document["title_head"], 
            document["authors"], 
            document["advisor"], 
            document["year"],
            document["keywords"],  
            document["file_link"]
        ])

    body = {
        "values": values
    }

    response = sheets_service.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=sheet_range,
        valueInputOption="USER_ENTERED",
        body=body
    ).execute()

    return response

# api save to sheetanddrive
class Document(BaseModel):
    file_id: str
    title_head: str
    authors: str
    advisor: str
    year: str
    keywords: str
    file_path: str

@app.post("/saveto_sheetanddrive/")
async def  save_to_sheet_and_drive(document_data: list[Document] = Body(...),authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, detail="ไม่มี access token")

    access_token = authorization.split()[1]
    try:
        credentials = Credentials(token=access_token)
        drive_service = build("drive", "v3", credentials=credentials)
        sheets_service = build("sheets", "v4", credentials=credentials)
        sheet_url, folder_id = get_url_folderid_fromtxtfile()

        for doc in document_data:
            doc_dict = doc.dict()
            if 'file_path' in doc_dict: 
                file_id, file_link = save_file_to_drive(doc_dict['file_path'], folder_id, doc_dict['file_id'], drive_service)
                doc_dict['file_id'] = file_id
                doc_dict['file_link'] = file_link

            save_extracteddata_to_sheet(sheet_url, [doc_dict], sheets_service)

        
        return {"message": "บันทึกข้อมูลลงใน sheet และ drive สำเร็จ", "data": document_data}
    
    except Exception as e:
        print(f"Error during processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการบันทึก: {str(e)}")

# api search data from sheet
@app.get("/search/")
async def search(query: str, mode: str = "and",authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, detail="ไม่มี access token")

    access_token = authorization.split()[1]
    credentials = Credentials(token=access_token)
    sheets_service = build("sheets", "v4", credentials=credentials)

    sheet_url, storage_file_id = get_url_folderid_fromtxtfile()
    sheet_id = sheet_url.split("/d/")[1].split("/")[0]
    sheet_range = "ชีต1!A2:F1000"

    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=sheet_id,
            range=sheet_range
        ).execute()

        values = result.get("values", [])

        keywords = [q.strip().lower() for q in query.split(",") if q.strip()]
        data_results = [
            row for row in values
            if all( 
                any(k in str(cell).lower() for cell in row)
                for k in keywords
            )
        ]

        return data_results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการดึงข้อมูล: {str(e)}")

@app.get("/all/")
async def all_data(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, detail="ไม่มี access token")

    access_token = authorization.split()[1]
    credentials = Credentials(token=access_token)
    sheets_service = build("sheets", "v4", credentials=credentials)

    sheet_url, storage_file_id = get_url_folderid_fromtxtfile()
    sheet_id = sheet_url.split("/d/")[1].split("/")[0]
    sheet_range = "ชีต1!A2:F1000"

    try:
        result = sheets_service.spreadsheets().values().get(
            spreadsheetId=sheet_id,
            range=sheet_range
        ).execute()

        values = result.get("values", [])

        return values

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการดึงข้อมูล: {str(e)}")

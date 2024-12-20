document.getElementById('profilePictureInput').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const previewImage = document.getElementById('previewImage');
        previewImage.src = reader.result;
        previewImage.style.display = 'block';
      };
      reader.readAsDataURL(file);
    }
  });
  
  document.getElementById('uploadForm').addEventListener('submit', (event) => {
    event.preventDefault(); // 기본 폼 동작 중지
    const fileInput = document.getElementById('profilePictureInput');
    const file = fileInput.files[0];
    
    if (!file) {
      alert('파일을 선택하세요.');
      return;
    }
  
    const formData = new FormData();
    formData.append('profilePicture', file);
  
    fetch('/upload-profile', {
      method: 'POST',
      body: formData,
      credentials: 'include', // 세션 정보 포함
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.profilePicture) {
          alert('프로필 사진 업로드 성공!');
          console.log('Uploaded file:', data.profilePicture);
        } else {
          alert('업로드 실패. 다시 시도하세요.');
        }
      })
      .catch((error) => {
        console.error('Error uploading profile picture:', error);
        alert('서버와의 통신 중 오류가 발생했습니다.');
      });
  });
  
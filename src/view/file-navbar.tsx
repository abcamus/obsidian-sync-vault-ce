import React, { useState, useRef, useEffect } from 'react';
import { i18n } from '../i18n';
import { cloudDiskModel } from 'src/model/cloud-disk-model';

interface FileNavBarProps {
  currentPath: string[];
  onNavigate: (path: string[]) => void;
}

const FileNavBar: React.FC<FileNavBarProps> = ({ currentPath, onNavigate }) => {
  const [showEllipsis, setShowEllipsis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (scrollRef.current) {
        setShowEllipsis(scrollRef.current.scrollWidth > scrollRef.current.clientWidth);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [currentPath]);

  const handleNavigate = (index: number) => {
    onNavigate(currentPath.slice(0, index + 1));
  };

  return (
    <div className="file-nav-bar">
      {showEllipsis && <span className="ellipsis">...</span>}
      <div className="file-nav-bar-scroll" ref={scrollRef}>
        {cloudDiskModel.encryptMode && <span className="lock-icon">🔒</span>} {/* 锁图标 */}
        <button onClick={() => onNavigate([])}>{i18n.t('fileNavBar.rootFolder')}</button>
        {currentPath.map((folder, index) => (
          <React.Fragment key={index}>
            <span className="path-separator">&#9656;</span>
            <button
              onClick={() => handleNavigate(index)}
              className={index === currentPath.length - 1 ? 'current-folder' : ''}
            >
              {folder}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default FileNavBar;

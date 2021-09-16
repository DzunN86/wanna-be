/** @jsx jsx **/
import { jsx, css } from '@emotion/react'
 
export const Loading = () => {
  return ( 
    <div className="flex items-center justify-center flex-1 p-10">
      <div
        css={css`
          .shine {
            opacity: 0.7; 
            background: rgba(205, 203, 203, 0.475);
            background-image: linear-gradient(
              to right,
              rgba(255, 255, 255, 0.2) 0%, 
              #c8cad1 20%,
              rgba(255, 255, 255, 0.2) 40%,
              #c8cad1 100%
            );
            background-repeat: no-repeat;
            background-size: 800px 104px;
            display: inline-block;
            position: relative;

            animation-duration: 1s;
            animation-fill-mode: forwards;
            animation-iteration-count: infinite;
            animation-name: placeholderShimmer;
            animation-timing-function: linear;
          }

          .box {
            height: 75px;
            width: 100px;
          }

          div {
            display: inline-flex;
            flex-direction: column;
            margin-left: 10px;
            margin-top: 15px;
            vertical-align: top;
          }

          .lines {
            height: 10px;
            margin-top: 10px;
            width: 140px;
          }

          .photo {
            display: block !important;
            width: 260px;
            height: 40px;
            margin-top: 15px;
          }

          @keyframes placeholderShimmer {
            0% {
              background-position: -468px 0;
            }

            100% {
              background-position: 468px 0;
            }
          }
        `}
      >
        <div className="box shine"></div>
        <div>
          <div className="lines shine"></div>
          <div className="lines shine"></div>
          <div className="lines shine"></div>
        </div>

        <div className="photo shine"></div>
      </div>
    </div>
  )
}

export default Loading;
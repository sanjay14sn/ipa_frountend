import { GST_RATE_LABEL, getFranchiseFeePayable } from "@/lib/gst";
import { formatDate } from "@/lib/date-utils";

export interface AgreementPoint {
  id: string;
  text: string;
  dynamic?: boolean;
}

export interface AgreementSection {
  id: string;
  title: string;
  description?: string;
  points: AgreementPoint[];
  order: number;
}

export interface AgreementContent {
  title: string;
  description: string;
  sections: AgreementSection[];
}

const defaultAgreementContent: AgreementContent = {
  title: "Franchisee Agreement Terms & Conditions",
  description:
    "Please read all terms and conditions carefully before proceeding.",
  sections: [
    {
      id: "franchise-agreement",
      title: "Franchise Agreement",
      description: "Fundamental terms of your franchise agreement",
      order: 1,
      points: [
        {
          id: "first-part",
          text: `THIS AGREEMENT MADE AND EXECUTED) at Chennai on the effective date as mentioned in Section
1 of SCHEDULE B BY AND BETWEEN Ideal Play Abacus India Pvt. Ltd, a company incorporated under the companies Act: 1956 and having its
Registered office at No:14 Thiru vi ka 3rd street Mylapore , Chennai – 600 014 represented by its Managing
Director Shaarada K Sriram, hereinafter referred to as the ‘FRANCHISOR’, which expression wherever the
context permits unless repugnant, include its (successors in-office, representatives and assigns) of the FIRST PART AND the Franchisee whose name and address are as specified in Sections 2 and 3 of attached SCHEDULE
B hereinafter referred to as ‘FRANCHISEE’ which expression wherever the context permits unless repugnant, include her/his (heirs, legal representatives, executors, administrators, successors and assigns) of the
SECOND PART.`,
          dynamic: false,
        },
        {
          id: "second-part",
          text: `WHEREAS the ‘Franchisor’has exclusive rights over the technical know-how and concepts developed by
them in teaching Mental Arithmetic to children in entire territory of India and to their products including the
literature developed by them. The ‘Franchisor’ has a complete set of teaching system (hereinafter
collectively referred to as (“the System and Product”) for purpose of teaching students a technique to carry
out Mental Arithmetic`,
          dynamic: true,
        },
        {
          id: "third-part",
          text: `WHEREAS the ‘Franchisee’ is desirous to acquire the right to use the System and Product and, to receive
training and assistance for the technical know-how from the ‘Franchisor’ for the purpose of teaching
students Mental Arithmetic at the ‘Franchise Centre’ under the ‘Name and Mark’ of the ‘Franchisor’.
WHEREAS the ‘Franchisor’ has agreed to appoint the party of the SECOND PART as the ‘Franchisee’
and has agreed to grant unto the ‘Franchisee’the permission to use the ‘System and Product’ and, to impart
training and provide assistance for the technical know-how to teach the students Mental Arithmetic under the
‘Name and Mark’ of the ‘Franchisor’ at the ‘Franchise Centre’.`,
          dynamic: false,
        },
        {
          id: "fourth-part",
          text: `WHEREAS the ‘Franchisee’ has the requisite infrastructure to teach the students Mental Arithmetic under
the ‘Name and Mark’ of the ‘Franchisor’.`,
          dynamic: false,
        },
        {
          id: "fifth-part",
          text: `WHEREAS the ‘Franchisee’ acknowledges the fact that the ‘Franchisor’s acceptance of this Agreement
does not constitute a representation, promise, warranty or guarantee by the ‘Franchisor’ that the Franchise
Business will be profitable or otherwise successful`,
          dynamic: false,
        },
        {
          id: "sixth-part",
          text: `WHEREAS the ‘Franchisee’ acknowledges receiving and reading this Agreement and any addenda hereto
and has been given an opportunity to clarify any provision that the ‘Franchisee’ did not understand. The ‘
Franchisee’ further acknowledges that he understands and accepts the terms, conditions and covenants
contained in this Agreement as being reasonably necessary to maintain ‘Franchisor’s’ high standards of
quality and service and the uniformity of those standards and thereby to protect and preserve the goodwill of
the ‘Name and Mark’ of the ‘Franchisor’. The parties have agreed to execute this Agreement to record the
terms and conditions of their understanding thereto.`,
          dynamic: false,
        },
        {
          id: "validity",
          text: `NOW THEREFORE THIS AGREEMENT WITNESSES AND IN CONSIDERATION OF THE
PREMISES, MUTUAL PROMISES, COVENANTS, WARRANTIES SET FORTH HEREINAFTER,
IT IS MUTUALLY AGREED AND DECLARED BY AND BETWEEN THE PARTIES AS UNDER`,
          dynamic: false,
        },
      ],
    },
    {
      id: "definitions",
      title: "Definitions",
      description:
        "In this Agreement, unless the context shall otherwise require, the following definitions shall apply:",
      order: 1,
      points: [
        {
          id: "agreement",
          text: `"Agreement" means this Franchise Agreement including all annexure and any subsequent written
modifications hereto.`,
          dynamic: false,
        },
        {
          id: "certificate-of-franchise-centre",
          text: `“Certificate of Franchise Centre”: the certificate issued by FRANCHISOR to the Franchisee, granting
the Franchisee the right to teach Mental Arithmetic at Centre and within the term stipulated thereon.`,
          dynamic: true,
        },
        {
          id: "confidential-information",
          text: `“Confidential Information” Information, documentations, trade and other technical or business
information, including proprietary materials, concepts, ideal, images, methods, teaching techniques (System),
teaching aids (Products), financial conditions, marketing strategies, know-how, operations and intellectual
property of the Franchisor, promotion techniques and knowledge of and experience in the operation and
franchising of Franchise Business, 3 disclosed directly or indirectly and in any form whatsoever (including,
but not limited to, disclosure made in writing, oral or in the form of models, computer programmes, hard
copy, soft copy or any human readable form, drawing or other instruments) furnished by the Franchisor to
the Franchisee. Such Confidential Information shall also include but shall not be limited to written or oral
information disclosed by the Franchisor and marked or stated as Confidential, at the time of disclosure.`,
          dynamic: false,
        },
        {
          id: "course-details",
          text: `“Course Details” – The offered under the Franchisor’s System and Product are Regular, Elementary
Level, Advanced Level and Grand Level, details of which are provided in the Manual annexed hitherto.`,
          dynamic: true,
        },
        {
          id: "effective-date",
          text: `“Effective Date” shall be the date of the Franchisor’s execution of this Agreement`,
          dynamic: true,
        },
        {
          id: "franchise",
          text: ` “Franchise” means non-exclusive, non-transferrable and nonassignable right to establish, run and operate
the “Franchise Business” in the designated Territory.`,
          dynamic: true,
        },
        {
          id: "franchise-business",
          text: `“Franchise Business” means the business of teaching Mental Arithmetic to the students using the
System and Product of the Franchisor by the Franchisee as per the instructions of the Franchisor by using
the technical know-how under the Name and Mark of the Franchisor, at the Franchise Centre`,
          dynamic: true,
        },
        {
          id: "franchise-centre",
          text: `“Franchise Centre” - The location at which the Franchisee would be conducting the course of the
Franchisor`,
          dynamic: true,
        },
        {
          id: "franchise-fee",
          text: `“Franchisee Fee” The fee payable by the Franchisee to Franchisor pursuant to Clause 5 herein.`,
          dynamic: true,
        },
        {
          id: "inspection-officer",
          text: `“Inspection Officer” A person who is authorized in writing by Franchisor to carry out such duties
relating to inspection, supervision, regulation, control and maintenance of Franchisor standard and the
System and Product at the Center.`,
          dynamic: true,
        },
        {
          id: "instructor-permit",
          text: `“Instructor Permit” A permit issued by Franchisor to an Instructor, specifying the Franchisor
programme, level and the validity period which the Instructor is authorized to teach at the Centre. xii.
“Intellectual Property” shall include all Trademarks, service marks, trade names, Trademarks registrations,
service mark registrations, copyrights, drawing, photographs, licenses, trade secrets and similar intangible
property rights necessary for the conduct of the business of the Franchisor`,
          dynamic: true,
        },
        {
          id: "liability",
          text: `“Liability” shall mean and include the meaning ascribed to that term in Clause 18`,
          dynamic: true,
        },
        {
          id: "manual",
          text: `“Manual” shall include a comprehensive set of rules, regulations and instructions for the conduct of the
Franchise by the Franchisee. The Manual shall form part of the Agreement and contents of the Manual shall
be subject to revision from time to time.`,
          dynamic: true,
        },
        {
          id: "month",
          text: `“Month” A calendar month according to the Gregorian calendar.`,
          dynamic: true,
        },
        {
          id: "name-and-mark",
          text: `“Name and Mark” shall mean the tradename and trademark of the Franchisor which includes the
trading name, mark, sign, logo under its intellectual property.`,
          dynamic: true,
        },
        {
          id: "royalty",
          text: `“Royalty” The portion of fees of each student payable by the Franchisee to the Franchisor`,
          dynamic: true,
        },
        {
          id: "student-fees",
          text: `“Student Fees” The Student Fees payable by students of the Centre which shall be fixed by
Franchisor from time to time at its own discretion and of which there shall be 4 lessons (2 hours per lesson)
per month`,
          dynamic: true,
        },
        {
          id: "system-and-product",
          text: `“System and Product” The teaching system (“the System”) and teaching aids (“the Products”) for
Mental Arithmetic or otherwise formulated and created by Franchisor or as may be formulated and created
by Franchisor or as may be formulated and created by Franchisor from time to time.`,
          dynamic: true,
        },
        {
          id: "target",
          text: `“Target” The total Royalty Fees payable to the Franchisor by the Franchisee during the Term of this
Agreement or such revised sum as may be imposed by Franchisor during the Renewed Term pursuant to
Clause 5 herein`,
          dynamic: true,
        },
        {
          id: "term",
          text: `“Term” shall have the meaning set out in Clause4 (i) below.`,
          dynamic: true,
        },
        {
          id: "termination",
          text: `“Termination” shall mean the termination of the Franchise Agreement by which the entire rights
assigned to the Franchisee by the Franchisor as regards the Franchise stands revoked as set out in Clause
16.`,
          dynamic: true,
        },
      ],
    },
    {
      id: "interpretation",
      title: "INTERPRETATION",
      description: "",
      order: 1,
      points: [
        {
          id: "first",
          text: "Words and expressions importing the singular number shall include the plural number and vice versa.",
          dynamic: false,
        },
        {
          id: "second",
          text: "Reference to the masculine gender will include reference to the feminine or neutral gender and vice versa",
          dynamic: true,
        },
        {
          id: "third",
          text: `The headings in this Franchise Agreement are inserted for convenience only and shall be ignored in
interpreting the meaning of this Agreement.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `Any reference to any statutory enactment shall be deemed to include a reference to such enactment as re-
enacted, modified or amended.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `The use of the word “including” shall mean and be deemed to mean “including without limitation.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "ownership",
      title: "OWNERSHIP",
      description: "",
      order: 1,
      points: [
        {
          id: "first",
          text: `Subject to the provisions herein contained, all rights in the System and Product are reserved by the
Franchisor for its own use and benefit. Franchisee acknowledges that Franchisee shall not acquire any
right, title, or interest in or to the System and Product as a result of the Franchisee’s use thereof. Franchisee
acknowledges that Franchisor is the owner of the System and the Product and agrees that it will not
challenge the validity of the System and the Product or the Franchisor ‘s ownership thereto.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "grant-and-renewal-of-franchise",
      title: "GRANT AND RENEWAL OF FRANCHISE",
      description: "",
      order: 1,
      points: [
        {
          id: "first",
          text: `This Agreement shall, subject to the provision for termination in Clause 16 below, subsist for a period of 3
years with effect from the effective date as mentioned in point 1 of SCHEDULE B`,
          dynamic: false,
        },
        {
          id: "second",
          text: `he Franchisor hereby grants to the Franchisee, during the Term right and license to teach Mental
Arithmetic using the System and Product for the CENTRE as specified in point 4 of the SCHEDULE B ,
However, the Franchisee does not have the right to sub-license the System and Product in full or partially to
any third party.`,
          dynamic: true,
        },
        {
          id: "third",
          text: `Subject to full compliance of the Franchisee’s obligations under this Agreement, the Franchisor agrees
to teach the Franchisee to use the System and Product for the aforesaid purpose.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `The Franchisee may, if it desires a renewal of the Agreement, give a written notice of its intentions for
renewal at least two months before the Expiry Date or such extended period as the Franchisor may agree to.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `The Franchisor, on receipt of such notice of renewal, may, in its sole discretion, extend/renew the term of
this Agreement at for such period not exceeding three (3) years, after the expiration of the term provided in
this Agreement and upon payment of the Fees`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `Renewal of the Franchise Agreement shall be effected by the execution by the Franchisor and the
Franchisee of the Franchisor’s then-current form of franchise agreement (which may provide for higher
fees and other significant provisions of which may vary, but without any further term or right of renewal),
general releases and all other agreements and legal instruments and documents then customarily used by the
Franchisor in the grant of franchises.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `The parties agree that in the event of Franchisee closing down its business, such closure being attributable
to a fault on his part, the Franchisor shall have the right to recover such amount towards the loss sustained
by it from the Franchisee and have a lien on its assets for the same.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `The parties confirm that each shall work independently within their sphere, subject however to all
reasonable restrictions.`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `No variation of terms of understanding between PLAY ABACUS SDN and Franchisor shall affect the
arrangement existing between the Franchisor and the Franchisee in these presents.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "franchise-centre",
      title: "FRANCHISE CENTRE",
      description: "",
      order: 1,
      points: [
        {
          id: "first",
          text: `The Franchisee shall only conduct such Mental Arithmetic and Abacus classes at the Franchise Centre
agreed under this Agreement.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `The Franchisee shall submit application for any proposed change in the premises of the Franchise Centre
to Franchisor at least two (2) months before the proposed change. The Franchisor is entitled to reject any
change in premises to avoid any conflict of interest or competition among the Franchise Centres.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `Upon the move of the Centre to the new premises, the Franchisee shall deliver the Certificate of
Franchise Centre to Franchisor to enable the necessary amendment to be made.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `The Franchisor may, if it considers appropriate, issue a new Certificate of Franchise Centre upon the
move of the Centre to new premises and upon receipt of the prescribed fee.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `f the Franchisee intends to cease operation at the Centre, the Franchisee shall submit notice of intention
to cease operation to Franchisor at least two (2) months before the cessation. The Franchisee shall also seek
prior written consent of Franchisor on the proposed arrangements for the students at the Centre to continue
with Franchisor programmes.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `The Certificate of Franchise Centre shall be surrendered to Franchisor one (1) week before the cessation
of operation and shall automatically cease to be valid upon the cessation of the operation at the Centre.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `The Franchisee shall remove and return the Centre signboard to Franchisor within one (1) month after
ceasing operation.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "franchise-fee",
      title: "FRANCHISE FEE AND ROYALTY",
      description: "",
      order: 1,
      points: [
        {
          id: "first",
          text: `The Franchisee shall pay the initial non-refundable Franchise Fee of ₹{franchiseFee} {gstClause} as specified in Section 5 of
SCHEDULE B to Franchisor on or before the date of this Agreement. The Franchise Fee is the sole amount payable under this Agreement; all other charges (royalty, materials, kit) are billed separately as and when they apply.`,
          dynamic: true,
        },
        {
          id: "second",
          text: `The Franchisee agrees to pay the Franchisor a portion of the ‘Student Fees’ collected by the Franchisee
at the Centre as ‘Royalty’ and the said ‘Student Fees’ collected shall be paid and apportioned among the
Franchisor, Franchisee and the Instructor in the manner as provided in SCHEDULE B.`,
          dynamic: true,
        },
        {
          id: "third",
          text: `The royalty for each month shall be payable by the Franchisee on or before every seventh (7th) day of
the next calendar month and all the payments can be payable by cheque / cash / bank as indicated by the
Franchisor`,
          dynamic: true,
        },
        {
          id: "fourth",
          text: `Notwithstanding any provision to the contrary herein contained, the Franchisor shall be entitled to revise
the amount of Student Fees, Royalty and any payments from time to time and shall be entitled to impose and
collect from the Franchisee from time to time such other fees, dues or payment including but not limited to
promotion and advertisement fees.`,
          dynamic: true,
        },
        {
          id: "fifth",
          text: `The Franchisee shall endeavor to meet the target of minimum 50 new registrations in a calendar year,
failing which the Franchisor shall have the right not to renew the Term hereof.`,
          dynamic: true,
        },
      ],
    },
    {
      id: "franchisor-rights-and-obligations",
      title: "FRANCHISOR’S RIGHTS AND OBLIGATIONS",
      description: "The Franchisor hereby declares the following:",
      order: 2,
      points: [
        {
          id: "first",
          text: `he Franchisor has the absolute right to promote the products and educational system of the Ideal Play
Abacus System. The Franchisor shall to the best of its ability, promptly attend to all the necessary
requirements of the Franchisee diligently.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `All The course materials supplied to the Franchisee shall be free from defects and in case it is found that
there are such defects, it will take all expeditious steps to rectify the same to the fullest satisfaction of the
Franchisee.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `Subject to the Franchisee’s compliance of the terms of this Agreement, Franchisor undertakes and
confirms the following:`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `The Franchisor shall be responsible for conducting the necessary examinations and supply all that is
necessary to enable the Franchisee to complete the course within the stipulated time.`,
        },
        {
          id: "fifth",
          text: `The Franchisor shall be responsible for training and updating the Course Instructor from time to time.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `The Franchisor shall support the Franchisee in its effort to increase the intake of students as well as to
promote the teaching of Mental Arithmetic using the System and Product at the cost and expenses of the
Franchisee.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `The Franchisor shall furnish examination papers to the Franchisee as and when necessary.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `The Franchisor shall issue Certificate of Completion to students who have successfully completed each
level of learning of Mental Arithmetic.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "duties-and-obligations-of-the-franchisee",
      title: "DUTIES AND OBLIGATIONS OF THE FRANCHISEE",
      description: "The Franchisee shall:",
      order: 3,
      points: [
        {
          id: "first",
          text: `To the best of its ability at all times observe, perform and comply with the rules and regulations given by
the Franchisor.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `Act loyally and faithfully to the Franchisor and obey all orders and instructions given by the Franchisor
and act in utmost good faith in order to protect the interest of the Franchisor.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `Shall conduct the Franchise Centre as per the standard information manual shared in the SCHEDULE A
of this Agreement.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `Shall purchase the materials supplied by the Franchisor and pay promptly the prices for the same as set
out in Schedule B or at such prices as may be determined by the Franchisor considering the market
fluctuation.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `Not conduct any similar type of mental arithmetic courses at the Franchise Centre or anywhere else and
within the territory without the express permission of the Franchisor in writing.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `At all times work diligently to increase the intake of students and sales of Product for the purpose of
teaching Mental Arithmetic by adopting the System and Product and to protect and promote the interest of
Franchisor`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `o conduct its business and uses its best endeavors to preserve and promote teaching of Mental
Arithmetic using the System and Product and to enhance the reputation of Franchisor.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `To offer full range of the Product for sales during promotional events which shall be
implemented/offered by Franchisor from time to time.`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `Declares to keep confidential all information including the concept and trade secrets of the Franchisor
courses and educational materials at any time during the currency, expiration or termination of this
agreement.`,
          dynamic: false,
        },
        {
          id: "tenth",
          text: `Keep and maintain proper books and accounts and register of students attending the Franchisor courses.`,
          dynamic: false,
        },
        {
          id: "eleventh",
          text: `At all reasonable times permit the Franchisor to inspect all records with or without prior written notice
from the Franchisor.`,
          dynamic: false,
        },
        {
          id: "twelfth",
          text: `Submit all such reports at such required intervals called for by the Franchisor.`,
          dynamic: false,
        },
        {
          id: "thirteenth",
          text: `Not assign or transfer its rights under this agreement to any third party without the prior written approval
of the Franchisor.`,
          dynamic: false,
        },
        {
          id: "fourteenth",
          text: `Provide the Franchisor with copy of the rental agreement in case where the course center(s) is situated
in rented premises.`,
          dynamic: false,
        },
        {
          id: "fifteenth",
          text: `At the Franchisee’s cost, to send their own appointed staff (which shall first be approved by Franchisor)
as Franchisor may from time to time reasonably require to attend any training courses for that purpose
approved or arranged by Franchisor`,
          dynamic: false,
        },
        {
          id: "sixteenth",
          text: `The Franchisee shall bear all cost and expenses for the setting up, operation and maintenance of the
Centre including employment of staff for the purpose of teaching Mental Arithmetic using the System and
Product.`,
          dynamic: false,
        },
        {
          id: "seventeenth",
          text: `The Franchisee shall collect the Product from the Franchisor and the cost of delivery and postage of
the Product by Franchisor shall be borne by the Franchisee.`,
          dynamic: false,
        },
        {
          id: "eighteenth",
          text: `To strictly comply with and adhere to all the rules and regulations of Franchisor, including such rules
and regulations as may be varied or revised by Franchisor from time to time.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "ownership-and-use-of-intellectual-property",
      title: "OWNERSHIP AND USE OF INTELLECTUAL PROPERTY",
      description: "The Franchisee undertakes the following:",
      order: 4,
      points: [
        {
          id: "first",
          text: `Not use the Franchisor logo, trade mark emblem or design without the permission of the Franchisor in
writing.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `Understands that it is prohibited from photocopying, imitating or reproducing any of the Franchisor
materials in any manner whatsoever.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `The Intellectual Property particularly the System and Product shall be used by the Franchisee for the sole
purpose of teaching Mental Arithmetic at the Centre. The Franchisee shall refrain from using or allowing the
use of the Intellectual Property for any other private or commercial purpose.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `Shall not reproduce or copy in any manner or way the Intellectual Property, whether indirectly or directly
for the purpose of venturing into any other 11 private or commercial purpose or for the purpose of setting up
another teaching school, network other than the Centre herein, to teach Mental Arithmetic or any form of
Mental Arithmetic.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `Shall notify the Franchisor of any suspected infringement of the Intellectual Property and shall take such
reasonable action as the Franchisor may direct at the expense of the Franchisee in relation to such
infringement.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `To indemnify Franchisor for any liability incurred to third parties for any use of the Intellectual Property
otherwise than in accordance with this Agreement.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `On the expiry or termination of this Agreement forthwith to cease to use the Intellectual Property.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `Not to carry any teaching of the Mental Arithmetic or trading of the System and Product which would or
might reasonably be expected by the Franchisee to be detrimental to Franchisor ‘s interests.`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `Not to tamper with any markings or name plates or other indications of the source of origin of the
Intellectual Property which may be placed by the Franchisor and not to alter the System and Product or
remove, conceal or otherwise interfere with the brand name, Trade Name or Trade Mark.`,
          dynamic: false,
        },
        {
          id: "tenth",
          text: `Not to use the Intellectual Property otherwise than as permitted by this Agreement`,
          dynamic: false,
        },
        {
          id: "eleventh",
          text: ` Not to use any name or mark similar to or capable of being confused with the Trade Name or Trade Mark`,
          dynamic: false,
        },
        {
          id: "twelfth",
          text: `Not to use the Trade Name or the Trade Mark or any derivation of them in its trading or corporate name
upon expiry or termination of this Agreement.`,
          dynamic: false,
        },
        {
          id: "thirteenth",
          text: `To hold any additional goodwill generated by the Franchise for the Intellectual Property as bare trustee
for Franchisor.`,
          dynamic: false,
        },
        {
          id: "fourteenth",
          text: `Not teach Mental Arithmetic using the System and Product and at any other place other than to the
students of the Centre. If the Franchisee intends to teach or promote the Mental Arithmetic using the System
and Product other than the Centre he must obtain consent of Franchisor in writing.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "inspection",
      title: "INSPECTION",
      description: "",
      order: 5,
      points: [
        {
          id: "first",
          text: `The Franchisee shall maintain proper recording and filing system and adhere to the standard set by
Franchisor at all times.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `The Inspection officer shall be entitled, from time to time, to supervise, regulate and control the standard
of the Centre in accordance with the standard determined by Franchisor and to inspect all the Mental
Arithmetic relevant registers, document, materials and articles. The Inspection Officer shall be entitled to
remove and retain any book, register, document, material or other article, which appears to him to be
detrimental to the interest of Franchisor or the students.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `The Inspection Officer shall prepare a report on the Centre which has been inspected and furnish a copy
of the report to the Franchisee. The Franchisee shall promptly carry out the recommendations and
instructions contained in such report.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `If the Franchisee fails to produce any data, all relevant register, document, material or article as required
by the Inspection Officer or fails to carry out the recommendations and instructions contained in the
Inspection Officer’s report, Franchisor shall be entitled to revoke the Certificate of Appointed Centre and
the Franchisee shall have no claims against Franchisor.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "accounts-and-payment",
      title: "ACCOUNTS AND PAYMENT",
      description: "",
      order: 6,
      points: [
        {
          id: "first",
          text: `The Franchisee shall keep proper and up to date books of account and records showing all transaction
relating to business of the Centre and, in particular: \n a. the number of students registered at the Centre \n b. Details of the students registered`,
          dynamic: false,
        },
        {
          id: "second",
          text: `Every student taking admission for the course to be conducted by the Franchisee under this Agreement
shall first get himself/herself registered with the Franchisor by paying registration fee as specified in Section
7 of SCHEDULE B or as may be fixed from time to time by the Franchisor. For the sake of convenience of
the students, the registration fee shall be collected by the Franchisee on behalf of the Franchisor. The
Franchisee shall immediately remit the amount of Registration Fee so collected to the Franchisor.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `the payment of fees received, receivable, payable or outstanding by the 13 students and to make available
to Franchisor on request such books of account, records, reports, returns and other information relating to
the business of the Centre as Franchisor may reasonably require and to allow the authorized officers and
employees of Franchisor to have access to any books and records of the kinds referred to herein.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `The Franchisee shall submit to the Franchisor all relevant and required data and be upto date with the
online system.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `The Franchisor shall equip each student registered with it with a kit at the initial stage which shall contain
an abacus, bag, T-shirt and books for the 1st level.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: ` The Franchisee shall pay the Franchisor the initial fee as set out in Clause 6 (i) on signing these presents
which does not bear any interest and non-refundable under any circumstances.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `The Franchisee shall pay course material charges per level to the Franchisor as stipulated in Section 8
of SCHEDULE B`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `The Franchisee shall collect the particular portion fee as set out in Section 9 of the SCHEDULE B and
from that amount, pay a sum as specified in Section 9 of SCHEDULE B per child to Franchisor.`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `The parties agree that all payments made, paid, received or receivable shall be the subject to the Tax Laws
of India.`,
          dynamic: false,
        },
        {
          id: "tenth",
          text: `The parties agree that this agreement is on a principle to principle basis and does not constitute any
agency, partnership or association between the parties.`,
          dynamic: false,
        },
        {
          id: "eleventh",
          text: `It is agreed that it shall be the responsibility of the Franchisor and Franchisee to comply with all laws,
rules and regulations as far as the business of the parties is concerned.`,
          dynamic: false,
        },
        {
          id: "twelfth",
          text: `The parties agree that the accounts and audit shall be maintained by a Chartered Accountant.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "non-compete",
      title: "NON-COMPETE",
      description: "",
      order: 7,
      points: [
        {
          id: "first",
          text: `During the term of this Agreement, the Franchisee shall not, on its own or on behalf of or in connection with
any third party, directly or indirectly, in any capacity whatsoever including as an employer, employee,
principal, agent, joint-venture partner, partner, shareholder or 14 other equity holder, independent contractor,
licensor, licensee, franchiser, franchisee, Franchisee, consultant, supplier or trustee or by / through any
corporation, cooperative, partnership, trust, unincorporated association or otherwise carry on, be engaged in,
have any financial or other interest in or be otherwise commercially involved in any endeavour, activity or
business which is similar to or is / may be in competition with the business of the Franchisor i.e., teaching of
Mental Arithmetic or Abacus, pursuant to the terms and conditions of this Agreement. It is further agreed that
the Franchisee shall not do any other business of a similar kind and nature nor shall he enter into any
transaction with any other entity to market for the purposes of teaching Mental Arithmetic or Abacus.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "assignment-transfer-encumbrance",
      title: "ASSIGNMENT, TRANSFER AND ENCUMBRANCE",
      description: "",
      order: 8,
      points: [
        {
          id: "first",
          text: `This Agreement, and any or all of the Franchisor’s rights and/or obligations under it, are transferable by
the Franchisor in whole or in part, without the consent of the Franchisee and shall inure to the benefit of
any person or entity to whom the Franchisor transfers it, or to any other legal successor to the Franchisor’s
interests in this Agreement.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `This Franchise Agreement is personal to the Franchisee and neither the Agreement nor any part or all of
the ownership of the Franchisee may be voluntarily, involuntarily, directly or indirectly assigned,
subdivided, sub-franchised or otherwise transferred by the Franchisee without the prior written consent of
the Franchisor, and any such assignment or transfer without such consent shall constitute a breach hereof
and shall convey no rights to or interest in the Agreement and shall be null and void.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `The Franchisee shall not incur or purport to incur any liability on behalf of Franchisor or in any way
pledge or purport to pledge Franchisor credit or accept any order to make contract binding upon Franchisor
without the Franchisor first approving in writing.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "proprietary-and-confidential-information",
      title: "PROPRIETARY AND CONFIDENTIAL INFORMATION",
      description:
        "The Franchisee hereby covenants that they or their servants, agents shall acknowledge and agree that:",
      order: 9,
      points: [
        {
          id: "first",
          text: `The Franchisor possesses certain confidential and proprietary information including but not limited to
managerial techniques and other activities of the Business in which the Franchisor possesses valuable
Confidential Information.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `The Franchisor shall disclose such parts of the Confidential Information as are required for the operation
of this Agreement to the Franchisee and in guidance to the Franchisee during the term of this Agreement.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `The Franchisee will not acquire any interest in the Confidential Information, other than the right to utilize
it in the development and operation of the Franchise Business during the term of the Agreement, and that the
use or duplication of the Confidential Information in any other Franchise Business would constitute an
unfair method of competition with the Franchisor and its other Franchisees.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `The Franchisee will hold the Confidential Information absolutely secret and in strictest confidence and
not to at any time during or after the Term, disclose or use or permit to be disclosed or used any of the
Confidential Information or any other affairs of Franchisor for any purpose other than upon the instruction
and direction of Franchisor.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `The Confidential Information is disclosed to the Franchisee solely on the condition that the Franchisee
agrees, and the Franchisee does hereby agree, that it: a. Will use the Confidential Information only for the Business and not for any other purpose for all times to
come; b. Will maintain the absolute confidentiality of the Confidential Information during and after the term of this
Agreement; c. Will not make unauthorized copies of any portion of the Confidential Information disclosed in any form;
and d. Will adopt and implement all reasonable procedures prescribed from time to time by the Franchisor to
prevent unauthorized use or disclosure of the Confidential Information.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `Notwithstanding anything to the contrary contained in this Agreement, the restrictions on the Franchisee
’s disclosure and use of the Confidential Information shall not apply to: a. Information, processes or techniques which are or become generally known by operators of businesses that
are competitive with Franchisees of the Franchisor, other than through disclosure (whether deliberate or
inadvertent) by the Franchisee; or b. Disclosure of Confidential Information in judicial, arbitral or administrative proceedings to the extent the
Franchisee is legally 16 compelled to disclose such information, provided the Franchisee shall have used its
best efforts, and shall have afforded the Franchisor the opportunity, to obtain an appropriate protective order
or other assurance satisfactory to the Franchisor of confidential treatment for the information required to be
so disclosed.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `All ideas, concepts, techniques or material relating to the operation of the Centre whether or not
protectable intellectual property and whether created by or for the Franchisee or the Franchisee’s
employees, must be promptly disclosed to the Franchisor and will be deemed to be the Franchisor’s sole
and exclusive property and works made-for-hire for the Franchisor. To the extent any item does not qualify
as a “work made-for-hire” for the Franchisor, by this paragraph the Franchisee assigns ownership of that
item and all related rights to that item, to the Franchisor and agrees to sign whatever assignment or other
documents the Franchisor requests to evidence the Franchisor’s ownership or to help the Franchisor
obtain intellectual property rights in the item.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `The Franchisee agrees that, as of the effective date of a Termination, the Franchisee shall immediately
cease to use the Confidential Information disclosed to or otherwise learned or acquired and return to the
Franchisor all copies of the Confidential Information loaned or made available to the Franchisee.`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `The parties understand that the information shared by the parties are highly secretive, confidential in
nature and shall not disclose them either during the currency of the agreement or at any time thereafter.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "representations-and-warranties",
      title: "REPRESENTATIONS AND WARRANTIES",
      description: "The Parties represent and warrant as under:",
      order: 10,
      points: [
        {
          id: "first",
          text: `They have the requisite power and authority to enter into this Agreement and perform all the obligations
under this Agreement and that their obligations under this Agreement do not conflict with their obligations
under any other Agreement or contract.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `They have the requisite authority and approvals to perform their obligations under this Agreement. They
shall, at all times, have the requisite statutory and other approvals to be in conformance with this Agreement
and perform their obligations hereunder.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `Each Party shall comply with all the terms and conditions of this Agreement and shall indemnify the other
non-breaching Parties for any loss or damage caused to them for any breach of this Agreement by such Party.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `The Franchisee shall not make any representation or give any warranty or guarantee whatever, whether
express or implied in connection with the success of the System and Product in teaching students to produce
Mental Arithmetic other than as contained in any advertising matter from time to time provided by
Franchisor or in accordance with the Franchisor’s guarantee.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `In consideration of payment of amount specified in Clause 6 (i) by the Franchisee to the Franchisor and
observation of the covenants on the part of the Franchisee contained in these presents, the Franchisor
hereby agrees to license / grant to the Franchisee and the Franchisee hereby agree to accept the said license/
grant: a. to conduct Franchisor’s courses as set out in SCHEDULE A hereto at the Franchisee’s area specified in
Section-4 of the SCHEDULE B hereto; and b. to manage and operate the Centre for the term specified in Section 6 of the SCHEDULE B hereto.`,
          dynamic: false,
        },
        {
          id: "mid",
          text: `The Franchisee represents and warrants as under:`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `The Franchisee shall not make any additions or alterations to the Products, unless expressly permitted in
writing by the Company.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `The Franchisee shall use the intellectual property of the Company, the Know How and the Trademarks
of the Company’s Licensor only for the purposes of this Agreement.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `The Franchisee shall take and keep valid during the term of this Agreement, such insurance covers with
respect to the Products as may be required by the Company.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "termination",
      title: "TERMINATION",
      description:
        "The Franchisor may terminate the Agreement prior to the Expiry Date if the Franchisee:",
      order: 11,
      points: [
        {
          id: "first",
          text: `becomes bankrupt / goes into liquidation / becomes insolvent;`,
          dynamic: false,
        },
        {
          id: "second",
          text: `if there is a change in the status / constitution / ownership / conversion into partnership firm or any other
firm of change in the Franchised Business whether sole proprietor / partner / company;`,
          dynamic: false,
        },
        {
          id: "third",
          text: `has an administrator or receiver of its undertaking appointed;`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `commits an incurable breach of a material provision of the Agreement (see below);`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `fails to remedy a breach complained of within a specified time;`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `repeatedly breaches provisions of the Agreement;`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `abandons the Franchised Business;`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `is convicted of a [serious] criminal offence;`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `persistent complaints to the Franchisor about the quality of service provided by the Franchisee;`,
          dynamic: false,
        },
        {
          id: "tenth",
          text: `supplying misleading or false information in support of the franchise application;`,
          dynamic: false,
        },
        {
          id: "eleventh",
          text: `the Franchisee’s Franchised Business having a detrimental effect on the goodwill of the Franchised
Business;`,
          dynamic: false,
        },
        {
          id: "twelfth",
          text: `failure to commence the Franchised Business within a specified period;`,
          dynamic: false,
        },
        {
          id: "thirteenth",
          text: `failure to make payments due under the agreement;`,
          dynamic: false,
        },
        {
          id: "fourteenth",
          text: `failure to operate the Franchised Business in accordance with the agreement in the manual [or the
Franchisor’s reasonable instruction];`,
          dynamic: false,
        },
        {
          id: "fifteenth",
          text: `the transfer of any rights, licenses, etc. other than in accordance with the terms of the Agreement;`,
          dynamic: false,
        },
        {
          id: "sixteenth",
          text: `delay in submitting accounts and records;`,
          dynamic: false,
        },
        {
          id: "seventeenth",
          text: `disclosure of confidential information;`,
          dynamic: false,
        },
        {
          id: "eighteenth",
          text: `refusal to permit an inspection of Franchisee’s site or an examination or audit of any of the books, records,
or financial statement;`,
          dynamic: false,
        },
        {
          id: "nineteenth",
          text: `failure to obtain Franchisor’s approval where this is prescribed by the Agreement.`,
          dynamic: false,
        },
        {
          id: "twentieth",
          text: `Failure to conduct the Franchise Centre as per the standard information manual shared in the SCHEDULE
C of this Agreement`,
          dynamic: false,
        },
        {
          id: "twenty-first",
          text: `If the Franchise Centre if not functional for a period of 6 months consecutively, a notice is issued by the
Franchisor and no response is received from the Franchisee`,
          dynamic: false,
        },
        {
          id: "twenty-second",
          text: `If any modification or otherwise in law prohibits the activities envisaged under this Agreement`,
          dynamic: false,
        },
        {
          id: "twenty-third",
          text: `Uses the premise for activities other than the Franchise Business.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "termination-of-agreement",
      title: "CONDITIONS FOLLOWING TERMINATION",
      description: "On termination of this Agreement, the Franchisee shall:",
      order: 12,
      points: [
        {
          id: "first",
          text: `cease to trade under the Trade Name or Proprietary Marks`,
          dynamic: false,
        },
        {
          id: "second",
          text: `not hold themselves out as the operators of the Franchised Business.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `not make or receive telephone calls in connection with the Franchised Business`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `pass enquiries, details of potential students to the Franchisor`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `not divulge or use any Confidential Information`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `fails to operate the business in accordance with the agreement [or the Franchisor’s reasonable instruction`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `give all the details of the students enrolled in all the courses under the Franchisee to the Franchisor.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `pay all monies owing to clients against unexecuted packages where applicable.`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `return the System and Product to the Franchisor (without copying it).`,
          dynamic: false,
        },
        {
          id: "tenth",
          text: `pay all debts owing to creditors of the Franchisee’s Franchised Business.`,
          dynamic: false,
        },
        {
          id: "eleventh",
          text: `Pay penalty of INR 2,00,000 to the Franchisor if the franchise agreement is terminated in any or all of the
circumstances: Franchisee allowed course materials of Franchisor to be used at a center not being the Franchise Center.
Franchisee made unauthorized photocopies of the course materials. Franchisee provided unauthorized
training to course instructor / students without prior approval from the Franchisor Franchisee is found to be
marketing of competitive programmes not authorized / conducted by the Franchisor.`,
          dynamic: false,
        },
        {
          id: "twelfth",
          text: `join the Franchisor in cancelling any registered license agreement of the Trade Mark.`,
          dynamic: false,
        },
        {
          id: "thirteenth",
          text: `the Franchisee shall not engage in any Franchised Business which competes with the Franchised Business
in the Territory for period of [three] years after termination.`,
          dynamic: false,
        },
        {
          id: "fourteenth",
          text: `The Franchisee shall not compete with the Franchised Business within the Territory of any other
Franchisee for period of [three] years after the expiration and/or termination there of.`,
          dynamic: false,
        },
        {
          id: "fifteenth",
          text: `The Franchisee shall not for a period of [thirty six] months solicit any employees of the Franchisor or
any individuals employed in the Franchisee’s Franchised Business in the last six months prior to
termination.`,
          dynamic: false,
        },
        {
          id: "sixteenth",
          text: `In the interest of continuity and protection of Franchised Business goodwill the Franchisor shall be
entitled to enter directly themselves or through Franchisor’s approved agency on the Premises to operate the
Franchisee’s Franchised Business free from encumbrances after termination or expiry upon efflux of time
following written notice being given to the Franchisee. The Franchisor shall however pay to the
Franchisee the following sums of money to compensate for the Franchisee’s capital invested in the
Franchised Business: Infrastructure cost consisting of interiors, furniture, other utility materials supplied by the Franchisor and
fixtures after taking into account depreciation @ 25% p.a. on straight line method. 2. Equipments after taking into account depreciation @ 25% p.a. on straight line method.`,
          dynamic: false,
        },
        {
          id: "seventeenth",
          text: `The Franchise, shall vacate the franchised premise within ten working days upon the termination of this
Agreement.The Franchise, shall vacate the franchised premise within ten working days upon the termination of this
Agreement.`,
          dynamic: false,
        },
        {
          id: "eighteenth",
          text: `The Franchisee shall, in the event of Franchisor taking over the Franchised Business under clause
mentioned above, take steps to transfer the ownership/tenancy rights in the Premises and the assets to the
Franchisor together with any Lease or other agreements relating to the Franchised Business.`,
          dynamic: false,
        },
        {
          id: "nineteenth",
          text: `Save and except as provided in this Agreement the Franchisee shall have no right and the Franchisor
have no obligations to pay any compensation including damage or cost to the Franchisee on account of
termination of the Agreement. The Franchisee shall meet all his obligations incurred or borne under the
Agreement for undertaking the Franchisee operation including settling of dues (Statutory or otherwise),
compensation etc. to the employees employed by the Franchisee`,
          dynamic: false,
        },
        {
          id: "twentieth",
          text: `In the event that this Agreement is terminated/ expires in its entirety or with respect to any of the
obligations hereunder, Franchisee shall forthwith return all the products, designs, pamphlets, artwork,
hoarding and or any items/documents supplied by the Franchisor. The termination of this Agreement shall
not discharge, affect or otherwise modify the right and obligations of the parties established or incurred prior
to the termination hereof.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "liability",
      title: "LIABILITY",
      description: "The liability of the Franchisee and the Franchisor",
      order: 13,
      points: [
        {
          id: "first",
          text: `As referred in Clause 25.1, there exists no fiduciary or principle and agent relationship between the
Franchisor and the Franchisee.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `The Franchisor shall not be liable for any act arising out of the negligence or willful omission of the
Franchisor or his employees.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `TThe Franchisor is hereby absolved from any liabilities that may arise in the due course of the Franchise
Business.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `The Franchisor is hereby absolved from all the liabilities that may arise between the Franchisee and any
Third Party.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `The Franchisee shall be liable for all or any claims, damages and expenses of any nature whatsoever
arising directly or indirectly or suffered by Franchisor by reason of any negligent, dishonest, criminal, IPR
violations or fraudulent act of the Franchisee under this Agreement and/or for any loss and/or damage
caused to Franchisor.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `It is specifically agreed that Franchisee shall be solely and exclusively liable for the services provided by
it to third parties including customers/clients and also for all the activities carried out by it to fulfil its
obligations hereunder and/or for any loss and/or damage including loss of goodwill etc. caused to
Franchisor due to the same.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `If the Franchisee is in breach of any of terms, conditions, covenants and obligations under this
Agreement or if there is any claim is made against the Franchisor in respect of the Franchisee’s employees
and/or breach of this Agreement by the Franchisee, the Franchisee shall indemnify Franchisor against all
loss, damages, costs and expenses awarded against or incurred by Franchisor in connection with the claim.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `Notwithstanding Clause 25.1 herein, if the Franchisee breach any of the covenants under Clauses 9, 12
and 14 in this Agreement, the Franchisee shall be liable to pay Franchisor liquidated damages of Rs
2,00,000.00 without prejudice to Franchisor claim against the Franchisee for any other claim of damages in
respect of any other breach other Clauses 9, 12 and 14 herein.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "non-retention-of-funds",
      title: "NON-RETENTION OF FUNDS",
      description: "",
      order: 14,
      points: [
        {
          id: "first",
          text: `The Franchisee does not have the right to offset or withhold payments owed to the Franchisor for
amounts purportedly due to the Franchisee from the Franchisor as a result of any dispute of any nature but
will pay such amounts to the Franchisor and only thereafter seek reimbursement. If the Franchisee believes
that the Franchisor has violated any legal duty to the Franchisee, the Franchisee will, notwithstanding such
dispute, pay as designated all sums specified under this Agreement or any other agreement, to be paid to the
Franchisor (including royalties, any unpaid portion of the initial franchise fee and any marketing
contributions and/or amounts payable to Franchisee councils and/or cooperatives) and will not withhold any
payments until and unless such dispute has been finally determined in the Franchisee’s favour.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "dispute-resolution",
      title: "DISPUTE RESOLUTION",
      description: "",
      order: 15,
      points: [
        {
          id: "first",
          text: `The following provisions shall apply if any dispute or difference arises between the Parties relating to,
connected with or out of this Agreement (the ‘Dispute’).`,
          dynamic: false,
        },
        {
          id: "second",
          text: `A Dispute will be deemed to arise when one Party serves on the other Party a notice stating the nature of
the Dispute (a ‘Notice of Dispute’).`,
          dynamic: false,
        },
        {
          id: "third",
          text: `The Parties hereto agree that they will use all reasonable efforts to resolve between themselves, any
Disputes arising out of or relating to this Agreement through negotiations.`,
          dynamic: false,
        },
        {
          id: "fourth",
          text: `Any dispute arising out of or in connection with this Agreement, except for controversies, disputes, or
claims related to or based on the Franchisee’s use of the Name and Mark, the Franchisee’s obligation to
make royalty or other payments to the Franchisor or the Franchisee’s post-termination obligations, which
could not be settled by Parties through negotiations, the Parties agree to submit any dispute arising between
them to arbitration.`,
          dynamic: false,
        },
        {
          id: "fifth",
          text: `The Parties shall submit to Arbitration after the period of sixty (60) days from the service of the Notice of
Dispute, shall be referred to and finally resolved by arbitration in accordance with the Arbitration and
Conciliation Act, 1996 (‘Act’) and rules framed there under for the time being in force, and all proceedings
shall be conducted in English at Chennai.`,
          dynamic: false,
        },
        {
          id: "sixth",
          text: `The disputing Parties shall mutually appoint a sole arbitrator. In the event the disputing Parties are unable
to agree upon a single arbitrator within a period of 30 (thirty) days from the date of service of Notice of
Dispute, the arbitrator shall be appointed by the High Court in accordance with the Act.`,
          dynamic: false,
        },
        {
          id: "seventh",
          text: `The Franchisee and Franchisor agree that Arbitration shall be conducted on an individual, not a class-
wide, basis and that the Franchisor and the Franchisee shall be the only parties to any Arbitration
proceeding and that no such arbitration proceeding may be consolidated with any other arbitration
proceeding, nor shall any other person be joined as a party to such arbitration proceeding.`,
          dynamic: false,
        },
        {
          id: "eighth",
          text: `The decision of the Arbitrator in the form of an arbitral award shall be final and binding on the Parties.
The judgment upon the award may be entered in any court of competent jurisdiction.`,
          dynamic: false,
        },
        {
          id: "ninth",
          text: `Except claims for royalty fees and advertising contributions and other amounts owed to the Franchisor,
any and all claims arising out of or relating to this Agreement or the relationship of the Franchisee and the
Franchisor in connection with the Franchisee’s operation of the Franchise Business shall be barred unless
an action or proceeding is commenced within one (1) year from the date the Franchisee or the Franchisor
knew or should have known of the facts giving rise to such claims.`,
          dynamic: false,
        },
        {
          id: "tenth",
          text: `This Agreement shall be governed and interpreted in accordance with the laws of the Republic of India,
and the Parties irrevocably submit to the exclusive jurisdiction of courts at Chennai.`,
          dynamic: false,
        },
        {
          id: "eleventh",
          text: `This provision shall continue in full force and effect subsequent to and notwithstanding expiration or
termination of this Agreement.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "jurisdiction",
      title: "JURISDICTION",
      description: "",
      order: 16,
      points: [
        {
          id: "first",
          text: `The Franchisee agrees that any action arising out of or relating to this Agreement otherwise as a result of
the relationship between the Franchisor and the Franchisee, which is not required to be arbitrated hereunder
or as to which arbitration is waived, must be commenced in the Court of general jurisdiction of Chennai, and
the Franchisee irrevocably submits to the jurisdiction of such courts and waives any objection to jurisdiction
or venue of such court.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "waivers",
      title: "WAIVERS",
      description: "",
      order: 17,
      points: [
        {
          id: "first",
          text: `The Franchisor’s waiver of any breaches under this Agreement (whether by failure to exercise a power or
right available to the Franchisor, failure to insist on strict compliance with the terms, obligations or
conditions of any agreement, development of a custom or practice between the Franchisee and the
Franchisor, which is at variance with the terms of any Agreement, acceptance of partial or other payments
or otherwise) with respect to the Franchisee, will not affect the Franchisor’s rights with regard to any
breach by the Franchisee or constitute a waiver of the Franchisor’s right to demand exact compliance by
the Franchisee with the terms of this Agreement.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `Subsequent or other acceptance by the Franchisor of any payments or performance by the Franchisee
will not be deemed a waiver of any preceding or other breach by the Franchisee of this Agreement. The
rights and remedies provided in this Agreement are cumulative and the Franchisor will not be prohibited
from exercising any rights or remedies provided under this Agreement or permitted under law or equity.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "entire-agreement",
      title: "ENTIRE AGREEMENT",
      description: "",
      order: 18,
      points: [
        {
          id: "first",
          text: `This Agreement, including the introduction and Annexures hereto, constitutes the entire agreement between
the Franchisor and the Franchisee and there are no other oral or written understandings or agreements
between the Franchisor and Franchisee concerning the subject matter of this Agreement. Except as
expressly provided otherwise in this Agreement, this Agreement may be modified only by written agreement
signed by both the Franchisor and the Franchisee.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "severability",
      title: "SEVERABILITY, SUBSTITUTION OF VALID PROVISIONS",
      description: "",
      order: 19,
      points: [
        {
          id: "first",
          text: `Except as otherwise stated in this Agreement, each provision of this Agreement, and any portion of any
provision, is severable (including, but not limited to, any provision affecting any rights to recovery for breach
of any legal obligation), and the remainder of this Agreement will continue in full force and effect.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `To the extent that any provision restricting the Franchisee’s competitive activities is deemed
unenforceable, the Franchisee and the Franchisor agree that such provisions will be enforced to the fullest
extent permissible under governing law. The Franchisor may modify any invalid or unenforceable provision
to the extent required to be valid and enforceable and the Franchisee shall be bound by such modified
provisions. iii. The terminations of this Agreement (for whatever reason) shall not terminate any provision
which is expressly or by implication provided to come into or continue in force after such termination and
shall be without prejudice to the accrued rights and liabilities and other remedies of the parties of this
Agreement.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "independent-contractors-and-indemnification",
      title: "INDEPENDENT CONTRACTORS AND INDEMNIFICATION",
      description:
        "In this Agreement, unless the context shall otherwise require, the following definitions shall apply:",
      order: 20,
      points: [
        {
          id: "first",
          text: `The Franchisor and the Franchisee are independent contractors. The Franchisor and the Franchisee
agree that there does not exist any fiduciary relationship between them.`,
          dynamic: false,
        },
        {
          id: "second",
          text: ` Neither the Franchisor nor the Franchisee shall make any agreements or representations in the name of
or on behalf of the other or that their relationship is other than that of Franchisor-Franchisee and neither the
Franchisor nor the Franchisee shall be obligated by or have any liability under any agreements or
representations made by the other that are not expressly authorized hereunder.`,
          dynamic: false,
        },
        {
          id: "third",
          text: `The Franchisee agrees to indemnify the Franchisor and the Indemnified Parties from and against, and to
reimburse any of the Indemnified Parties for, any and all claims, obligations, damages, costs and taxes
arising directly or indirectly out of the Franchise Business the Franchisee conducts under this Agreement,
or the Franchisee’s breach of this Agreement. This indemnification shall be fully applicable and shall not be
voided or otherwise affected by any allegation or claims that the Franchisor has been negligent in any
degree.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "notice",
      title: "NOTICE",
      description: `Any notice to be given under, or in connection with the matters contemplated by, this Agreement shall be
in writing and shall be deemed to have been received by the addressee:`,
      order: 21,
      points: [
        {
          id: "first",
          text: `within 72 hours of posting if it is sent by A.R. Registered post with postage prepaid to the addressee’s
address herein mentioned;`,
        },
        {
          id: "second",
          text: `if it is dispatched by hand to the addressee’s address herein mentioned; or`,
        },
        {
          id: "third",
          text: `within 24 hours if it is sent by facsimile (with confirmation slip) or by electronic mail (with correct
electronic mail number).`,
        },
      ],
    },
    {
      id: "binding-effect",
      title: "BINDING EFFECT",
      description: "",
      order: 22,
      points: [
        {
          id: "first",
          text: `This Agreement shall be binding upon the respective assigns, heirs, personal representatives and successors
in title of the parties hereto.`,
          dynamic: false,
        },
        {
          id: "second",
          text: `All regulations, circulars, instructions issued in writing by Franchisor at any time shall be binding on the
Franchisee who shall duly comply with the same.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "language",
      title: "LANGUAGE",
      description: "",
      order: 23,
      points: [
        {
          id: "first",
          text: `All notices given under this Agreement shall be in English and if there is any discrepancy between any
document and any version of the same, the English version shall be definitive and authoritative one.`,
          dynamic: false,
        },
      ],
    },
    {
      id: "financial-terms",
      title: "Financial Terms",
      description: "Payment structure and financial obligations",
      order: 2,
      points: [
        {
          id: "royalty",
          text: "Monthly royalty of {royaltyGst}% on gross revenue",
          dynamic: true,
        },
        {
          id: "franchisee-share",
          text: "Franchisee share: {franchiseeShare}%",
          dynamic: true,
        },
        {
          id: "installments",
          text: "Only the Franchise Fee may be paid in {installmentMonths} monthly installments after a down payment of ₹{downPaymentAmount}{installmentGstClause}.",
          dynamic: true,
        },
      ],
    },
    {
      id: "operational-terms",
      title: "Operational Requirements",
      description: "Standards and requirements for franchise operations",
      order: 3,
      points: [
        {
          id: "training",
          text: "All training materials and support will be provided as per agreement",
          dynamic: false,
        },
        {
          id: "quality-standards",
          text: "Franchisee must maintain quality standards as defined by Abacus",
          dynamic: false,
        },
        {
          id: "audits",
          text: "Regular audits and assessments will be conducted",
          dynamic: false,
        },
      ],
    },
    {
      id: "support-terms",
      title: "Support & Resources",
      description: "What support and resources will be provided",
      order: 4,
      points: [
        {
          id: "marketing-support",
          text: "Marketing materials and campaigns will be provided by the franchisor",
          dynamic: false,
        },
        {
          id: "technical-support",
          text: "Ongoing technical support and software updates included",
          dynamic: false,
        },
        {
          id: "training-programs",
          text: "Access to regular training programs and workshops",
          dynamic: false,
        },
      ],
    },
    {
      id: "compliance-terms",
      title: "Compliance & Legal",
      description: "Legal obligations and compliance requirements",
      order: 5,
      points: [
        {
          id: "legal-compliance",
          text: "Franchisee must comply with all local laws and regulations",
          dynamic: false,
        },
        {
          id: "brand-usage",
          text: "Brand name and logo usage must follow brand guidelines",
          dynamic: false,
        },
        {
          id: "confidentiality",
          text: "All proprietary information must be kept confidential",
          dynamic: false,
        },
      ],
    },
  ],
};

// Helper function to replace dynamic placeholders with actual values
const replacePlaceholders = (text: string, data: any): string => {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    // Handle nested object properties like paymentDetails.royaltyGst
    const keys = key.split(".");
    let value = data;

    for (const k of keys) {
      value = value?.[k];
    }

    if (value === undefined || value === null) {
      return match; // Return original placeholder if value not found
    }

    // Format dates
    if (key.toLowerCase().includes("date") && value instanceof Date) {
      return formatDate(value);
    }

    // Format currency
    if (
      key.toLowerCase().includes("fee") ||
      key.toLowerCase().includes("cost")
    ) {
      return Number(value).toLocaleString();
    }

    return String(value);
  });
};

function pickFranchiseFeeTerms(franchiseData: any): {
  franchiseFee: number;
  gstFranchiseFee: boolean | null;
  installmentMonths: number | null;
  downPaymentAmount: number | null;
} {
  const pd = Array.isArray(franchiseData?.paymentDetails)
    ? franchiseData.paymentDetails[0]
    : franchiseData?.paymentDetails;
  const fee = Number(pd?.franchiseFee ?? 0);
  const gstFlag =
    pd?.gstFranchiseFee == null ? null : Boolean(pd.gstFranchiseFee);
  const months =
    pd?.installmentMonths != null ? Number(pd.installmentMonths) : null;
  const down =
    pd?.downPaymentAmount != null ? Number(pd.downPaymentAmount) : null;
  return {
    franchiseFee: fee,
    gstFranchiseFee: gstFlag,
    installmentMonths: months,
    downPaymentAmount: down,
  };
}

function buildGstClause(
  fee: number,
  gstFranchiseFee: boolean | null,
): string {
  if (fee <= 0 || gstFranchiseFee == null) return "";
  const payable = getFranchiseFeePayable(fee, gstFranchiseFee);
  if (payable.inclusive) return "(inclusive of 18% GST)";
  return `plus ${GST_RATE_LABEL} (₹${payable.gst.toLocaleString()} extra, ₹${payable.payable.toLocaleString()} total payable)`;
}

function buildInstallmentGstClause(gstFranchiseFee: boolean | null): string {
  if (gstFranchiseFee === false) {
    return ` (each installment attracts an additional ${GST_RATE_LABEL} at the time of payment)`;
  }
  return "";
}

// Function to get processed agreement content with dynamic values
export const getProcessedAgreementContent = (
  franchiseData: any,
  customContent?: AgreementContent
): AgreementContent => {
  const content = customContent || defaultAgreementContent;
  const fee = pickFranchiseFeeTerms(franchiseData);
  const gstClause = buildGstClause(fee.franchiseFee, fee.gstFranchiseFee);
  const installmentGstClause = buildInstallmentGstClause(fee.gstFranchiseFee);

  return {
    ...content,
    sections: content.sections
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        ...section,
        points: section.points.map((point) => ({
          ...point,
          text: point.dynamic
            ? replacePlaceholders(point.text, {
                ...franchiseData,
                franchiseFee: fee.franchiseFee,
                gstClause,
                installmentGstClause,
                installmentMonths: fee.installmentMonths ?? "",
                downPaymentAmount:
                  fee.downPaymentAmount != null
                    ? Number(fee.downPaymentAmount).toLocaleString()
                    : "0",
                royaltyGst: franchiseData.paymentDetails?.royaltyGst,
                franchiseeShare: franchiseData.paymentDetails?.franchiseeShare,
                installments: franchiseData.paymentDetails?.installments,
                expiryDate: new Date(franchiseData.expiryDate),
              })
            : point.text,
        })),
      })),
  };
};
